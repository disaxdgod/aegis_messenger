import {
  SOCKET_EVENTS,
  type CallKind,
  type CallRingPayload,
  type SerializedIceCandidateDTO,
  type SerializedSessionDescriptionDTO,
} from "@aegis/shared";
import type { Socket } from "socket.io-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  syncRealtimeSocket,
  useRealtimeSocketStore,
} from "@/stores/realtime-socket-store";
import { useSessionStore } from "@/stores/session-store";

function toIceInit(d: SerializedIceCandidateDTO): RTCIceCandidateInit {
  return {
    candidate: d.candidate ?? "",
    sdpMid: d.sdpMid ?? undefined,
    sdpMLineIndex:
      typeof d.sdpMLineIndex === "number" ? d.sdpMLineIndex : undefined,
  };
}

function rtDescInit(d: SerializedSessionDescriptionDTO): RTCSessionDescriptionInit {
  const t =
    d.type === "offer" || d.type === "answer" || d.type === "pranswer"
      ? d.type
      : "offer";
  return { type: t, sdp: d.sdp };
}

/** Очередь trickle ICE до установки удалённого описания SDP. */
function createRemoteIceBridging(pc: RTCPeerConnection) {
  const pending: SerializedIceCandidateDTO[] = [];
  async function flush(): Promise<void> {
    while (pending.length > 0) {
      const c = pending.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(toIceInit(c)));
      } catch {
        /* игнорируем битые кандидаты */
      }
    }
  }
  return {
    onRemoteIce(candidate: SerializedIceCandidateDTO): void {
      if (!pc.remoteDescription) {
        pending.push(candidate);
        return;
      }
      void pc.addIceCandidate(new RTCIceCandidate(toIceInit(candidate))).catch(
        () => {},
      );
    },
    flushPending: (): Promise<void> => flush(),
  };
}

const ICE_TEMPLATE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

function serializeDescription(
  desc: RTCSessionDescriptionInit,
): SerializedSessionDescriptionDTO {
  const t = typeof desc.type === "string" ? desc.type : "";
  return { type: t, sdp: desc.sdp ?? "" };
}

type CallUi =
  | { screen: "hidden" }
  | { screen: "incoming"; ring: CallRingPayload }
  | {
      screen: "outgoing";
      callId: string;
      chatId: string;
      kind: CallKind;
      label: string;
    }
  | { screen: "live"; callId: string; kind: CallKind; label: string };

type WebRtcCallsApi = {
  ui: CallUi;
  errorHint: string | null;
  connectingIncomingAnswer: boolean;
  startOutgoingChatCall: (
    backendChatId: string,
    kind: CallKind,
    peerDisplayName: string,
  ) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  hangUp: () => void;
  dismissError: () => void;
  terminateActiveCall: () => void;
  socketConnected: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
};

const WebRtcCallsContext = createContext<WebRtcCallsApi | null>(null);

export function useWebRtcCalls(): WebRtcCallsApi {
  const ctx = useContext(WebRtcCallsContext);
  if (!ctx) throw new Error("useWebRtcCalls вне WebRtcCallsProvider");
  return ctx;
}

export function WebRtcCallsProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const accessToken = useSessionStore((s) => s.accessToken);
  const socket = useRealtimeSocketStore((s) => s.socket);

  const [ui, setUi] = useState<CallUi>({ screen: "hidden" });
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [connectingIncomingAnswer, setConnectingIncomingAnswer] =
    useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isCallerRef = useRef(false);

  const socketOffRef = useRef<Array<() => void>>([]);

  const detachSocketListeners = useCallback(() => {
    socketOffRef.current.forEach((off) => {
      try {
        off();
      } catch {
        /* ignore */
      }
    });
    socketOffRef.current = [];
  }, []);

  const resetMediaUi = useCallback(() => {
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = null;
    isCallerRef.current = false;
    setConnectingIncomingAnswer(false);

    detachSocketListeners();

    const rv = remoteVideoRef.current;
    const lv = localVideoRef.current;
    if (rv) rv.srcObject = null;
    if (lv) lv.srcObject = null;
    setUi({ screen: "hidden" });
  }, [detachSocketListeners]);

  const terminateCallNotify = useCallback(
    (emitEnd: boolean) => {
      const id = callIdRef.current;
      const s = useRealtimeSocketStore.getState().socket;
      if (emitEnd && id && s?.connected) {
        s.emit(SOCKET_EVENTS.callEnd, { callId: id });
      }
      resetMediaUi();
    },
    [resetMediaUi],
  );

  const acquireLocalMedia = useCallback(
    async (kind: CallKind): Promise<MediaStream> => {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          kind === "video" ?
            { facingMode: "user", width: { ideal: 720 } }
          : false,
      });
    },
    [],
  );

  const wireLocalIceSend = useCallback((pc: RTCPeerConnection, s: Socket) => {
    const activeIdRef = callIdRef;
    pc.onicecandidate = (ev) => {
      const cid = activeIdRef.current;
      if (!cid || ev.candidate == null || !s.connected) return;
      const c = ev.candidate;
      s.emit(SOCKET_EVENTS.webrtcIce, {
        callId: cid,
        candidate: {
          candidate: c.candidate,
          sdpMid: c.sdpMid,
          sdpMLineIndex: c.sdpMLineIndex,
        },
      });
    };
  }, []);

  const attachRemotePlayback = useCallback((stream: MediaStream) => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = false;
    void el.play().catch(() => {});
  }, []);

  const attachLocalPlayback = useCallback((stream: MediaStream) => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = true;
    void el.play().catch(() => {});
  }, []);

  const beginCallerNegotiationAfterAccept = useCallback(
    async (s: Socket, callId: string, kind: CallKind, label: string) => {
      try {
        const stream = await acquireLocalMedia(kind);
        localStreamRef.current = stream;
        attachLocalPlayback(stream);

        const pc = new RTCPeerConnection(ICE_TEMPLATE);
        pcRef.current = pc;
        const iceBridge = createRemoteIceBridging(pc);

        for (const t of stream.getTracks()) pc.addTrack(t, stream);

        pc.ontrack = (ev) => {
          if (ev.streams[0]) attachRemotePlayback(ev.streams[0]);
        };

        wireLocalIceSend(pc, s);

        const onAnswer = async (payload: {
          callId?: string;
          description?: SerializedSessionDescriptionDTO;
        }) => {
          if (
            payload.callId !== callId ||
            !payload.description ||
            pc.signalingState === "closed"
          )
            return;
          await pc.setRemoteDescription(
            new RTCSessionDescription(rtDescInit(payload.description)),
          );
          await iceBridge.flushPending();
        };

        const onCalleeIce = (payload: {
          callId?: string;
          candidate?: SerializedIceCandidateDTO;
        }) => {
          if (payload.callId !== callId || !payload.candidate) return;
          iceBridge.onRemoteIce(payload.candidate);
        };

        s.on(SOCKET_EVENTS.webrtcAnswer, onAnswer);
        s.on(SOCKET_EVENTS.webrtcIce, onCalleeIce);
        socketOffRef.current.push(
          () => s.off(SOCKET_EVENTS.webrtcAnswer, onAnswer),
          () => s.off(SOCKET_EVENTS.webrtcIce, onCalleeIce),
        );

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setUi({ screen: "live", callId, kind, label });
        s.emit(SOCKET_EVENTS.webrtcOffer, {
          callId,
          description: serializeDescription(offer),
        });
      } catch (e: unknown) {
        setErrorHint(e instanceof Error ? e.message : "Не удалось начать звонок");
        terminateCallNotify(true);
      }
    },
    [
      acquireLocalMedia,
      attachLocalPlayback,
      attachRemotePlayback,
      terminateCallNotify,
      wireLocalIceSend,
    ],
  );

  const calleeSetupAfterAcceptRing = useCallback(
    async (ring: CallRingPayload, s: Socket) => {
      const callId = ring.callId;
      const pendingOffers: SerializedSessionDescriptionDTO[] = [];
      /** Показатель: локальные треки уже в peer connection до прихода offer. */
      let mediaPrimed = false;

      try {
        const pc = new RTCPeerConnection(ICE_TEMPLATE);
        pcRef.current = pc;
        const iceBridge = createRemoteIceBridging(pc);

        pc.ontrack = (ev) => {
          if (ev.streams[0]) attachRemotePlayback(ev.streams[0]);
        };

        async function consumeOffer(description: SerializedSessionDescriptionDTO) {
          if (pc.signalingState === "closed") return;
          await pc.setRemoteDescription(
            new RTCSessionDescription(rtDescInit(description)),
          );
          await iceBridge.flushPending();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          s.emit(SOCKET_EVENTS.webrtcAnswer, {
            callId,
            description: serializeDescription(answer),
          });
        }

        const onOffer = async (payload: {
          callId?: string;
          description?: SerializedSessionDescriptionDTO;
        }) => {
          if (
            payload.callId !== callId ||
            !payload.description ||
            pc.signalingState === "closed"
          )
            return;
          if (!mediaPrimed) {
            pendingOffers.push(payload.description);
            return;
          }
          await consumeOffer(payload.description);
        };

        const onCallerIce = (payload: {
          callId?: string;
          candidate?: SerializedIceCandidateDTO;
        }) => {
          if (payload.callId !== callId || !payload.candidate) return;
          iceBridge.onRemoteIce(payload.candidate);
        };

        s.on(SOCKET_EVENTS.webrtcOffer, onOffer);
        s.on(SOCKET_EVENTS.webrtcIce, onCallerIce);
        socketOffRef.current.push(
          () => s.off(SOCKET_EVENTS.webrtcOffer, onOffer),
          () => s.off(SOCKET_EVENTS.webrtcIce, onCallerIce),
        );

        const stream = await acquireLocalMedia(ring.kind);
        localStreamRef.current = stream;
        attachLocalPlayback(stream);

        for (const t of stream.getTracks()) {
          pc.addTrack(t, stream);
        }

        wireLocalIceSend(pc, s);
        mediaPrimed = true;
        if (pendingOffers.length > 0) {
          await consumeOffer(pendingOffers.shift()!);
        }

        const label =
          ring.fromUsername?.trim()?.length ?
            `@${ring.fromUsername}`
          : "Собеседник";
        setUi({ screen: "live", callId, kind: ring.kind, label });

        s.emit(SOCKET_EVENTS.callAccept, { callId });
      } catch (e: unknown) {
        setErrorHint(e instanceof Error ? e.message : "Не удалось ответить");
        if (s.connected) {
          s.emit(SOCKET_EVENTS.callReject, { callId });
        }
        resetMediaUi();
      }
    },
    [
      acquireLocalMedia,
      attachLocalPlayback,
      attachRemotePlayback,
      resetMediaUi,
      wireLocalIceSend,
    ],
  );

  useEffect(() => {
    syncRealtimeSocket(accessToken ?? null);
  }, [accessToken]);

  useEffect(() => {
    if (!socket) return undefined;

    const onRing = (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        callIdRef.current !== null
      ) {
        return;
      }
      const r = payload as Partial<CallRingPayload>;
      if (
        typeof r.callId !== "string" ||
        typeof r.chatId !== "string" ||
        (r.kind !== "audio" && r.kind !== "video") ||
        typeof r.fromUserId !== "string"
      )
        return;
      const ringPayload: CallRingPayload = {
        callId: r.callId,
        chatId: r.chatId,
        kind: r.kind,
        fromUserId: r.fromUserId,
        fromUsername:
          typeof r.fromUsername === "string" ? r.fromUsername : "",
      };
      callIdRef.current = ringPayload.callId;
      isCallerRef.current = false;
      setConnectingIncomingAnswer(false);
      setUi({ screen: "incoming", ring: ringPayload });
    };

    const onEnded = () => {
      terminateCallNotify(false);
    };

    socket.on(SOCKET_EVENTS.callRing, onRing);
    socket.on(SOCKET_EVENTS.callEnded, onEnded);

    const onRejected = (body: unknown) => {
      if (typeof body !== "object" || body === null || !("callId" in body))
        return;
      const cid = (body as { callId?: string }).callId;
      if (cid && cid === callIdRef.current && isCallerRef.current) {
        terminateCallNotify(false);
        setErrorHint("Звонок отклонён");
      }
    };

    socket.on(SOCKET_EVENTS.callRejected, onRejected);

    return () => {
      socket.off(SOCKET_EVENTS.callRing, onRing);
      socket.off(SOCKET_EVENTS.callEnded, onEnded);
      socket.off(SOCKET_EVENTS.callRejected, onRejected);
    };
  }, [socket, terminateCallNotify]);

  const startOutgoingChatCall = useCallback(
    (backendChatId: string, kind: CallKind, peerDisplayName: string) => {
      const s = useRealtimeSocketStore.getState().socket;
      if (!s?.connected) {
        setErrorHint("Нет соединения с сервером (Socket.IO)");
        return;
      }
      if (callIdRef.current) {
        setErrorHint("Уже активен другой звонок");
        return;
      }

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      isCallerRef.current = true;

      setUi({
        screen: "outgoing",
        callId,
        chatId: backendChatId,
        kind,
        label: peerDisplayName,
      });

      s.emit(SOCKET_EVENTS.callInvite, { callId, chatId: backendChatId, kind });

      const onAccepted = (body: unknown) => {
        if (typeof body !== "object" || body === null || !("callId" in body))
          return;
        const cid = (body as { callId?: string }).callId;
        if (cid !== callId || callIdRef.current !== callId) return;
        s.off(SOCKET_EVENTS.callAccepted, onAccepted);
        void beginCallerNegotiationAfterAccept(s, callId, kind, peerDisplayName);
      };

      s.on(SOCKET_EVENTS.callAccepted, onAccepted);
      socketOffRef.current.push(() =>
        s.off(SOCKET_EVENTS.callAccepted, onAccepted),
      );
    },
    [beginCallerNegotiationAfterAccept],
  );

  const acceptIncomingCall = useCallback(() => {
    if (ui.screen !== "incoming" || connectingIncomingAnswer) return;
    const s = useRealtimeSocketStore.getState().socket;
    if (!s?.connected) return;
    setConnectingIncomingAnswer(true);
    void calleeSetupAfterAcceptRing(ui.ring, s).finally(() => {
      setConnectingIncomingAnswer(false);
    });
  }, [connectingIncomingAnswer, calleeSetupAfterAcceptRing, ui]);

  const rejectIncomingCall = useCallback(() => {
    if (ui.screen !== "incoming") return;
    const cid = ui.ring.callId;
    useRealtimeSocketStore.getState().socket?.emit(SOCKET_EVENTS.callReject, {
      callId: cid,
    });
    resetMediaUi();
  }, [resetMediaUi, ui]);

  const hangUp = useCallback(() => {
    if (ui.screen === "incoming") {
      rejectIncomingCall();
      return;
    }
    terminateCallNotify(true);
  }, [rejectIncomingCall, terminateCallNotify, ui.screen]);

  const dismissError = useCallback(() => setErrorHint(null), []);

  const ctxValue = useMemo<WebRtcCallsApi>(
    () => ({
      ui,
      errorHint,
      connectingIncomingAnswer,
      startOutgoingChatCall,
      acceptIncomingCall,
      rejectIncomingCall,
      hangUp,
      dismissError,
      terminateActiveCall: () => terminateCallNotify(true),
      socketConnected: Boolean(socket?.connected),
      remoteVideoRef,
      localVideoRef,
    }),
    [
      ui,
      errorHint,
      connectingIncomingAnswer,
      socket?.connected,
      startOutgoingChatCall,
      acceptIncomingCall,
      rejectIncomingCall,
      hangUp,
      terminateCallNotify,
      dismissError,
      remoteVideoRef,
      localVideoRef,
    ],
  );

  const titleIncoming = (kind: CallKind) =>
    kind === "video" ? "Видеозвонок" : "Звонок";

  return (
    <WebRtcCallsContext.Provider value={ctxValue}>
      {children}
      {(ui.screen !== "hidden" || errorHint) && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="pointer-events-auto relative z-[1] flex w-full max-w-md flex-col gap-5 rounded-[20px] border border-theme-border bg-theme-card px-6 py-5 shadow-2xl"
          >
            <div className="space-y-1 text-center">
              <p className="text-base font-semibold text-theme-text">
                {ui.screen === "incoming" ?
                  `Входящий ${titleIncoming(ui.ring.kind).toLowerCase()}`
                : ui.screen === "outgoing" ?
                  `${titleIncoming(ui.kind)}…`
                : ui.screen === "live" ?
                  titleIncoming(ui.kind)
                : ui.screen !== "hidden" ?
                  ""
                : "Звонок"}
              </p>
              {ui.screen === "incoming" ?
                <p className="truncate text-sm text-theme-text-2">
                  От{" "}
                  {ui.ring.fromUsername?.trim()?.length ?
                    `@${ui.ring.fromUsername}`
                  : ui.ring.fromUserId}
                </p>
              : null}
              {(ui.screen === "outgoing" || ui.screen === "live") &&
              ui.label.trim().length > 0 ?
                <p className="truncate text-sm text-theme-text-2">{ui.label}</p>
              : null}
            </div>

            {ui.screen === "live" && ui.kind === "video" ?
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-theme-border bg-black">
                <video
                  ref={remoteVideoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  autoPlay
                />
                <video
                  ref={localVideoRef}
                  className="absolute bottom-2 right-2 h-28 w-[38%] max-w-[220px] overflow-hidden rounded-lg border border-white/20 bg-black shadow-lg object-cover"
                  playsInline
                  autoPlay
                />
              </div>
            : null}

            {ui.screen === "live" && ui.kind === "audio" ?
              <div className="flex justify-center py-8">
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-theme-border bg-theme-card-2 text-2xl text-theme-text">
                  ♪
                </span>
              </div>
            : null}

            {(ui.screen === "outgoing" || ui.screen === "incoming") &&
            connectingIncomingAnswer ?
              <p className="text-center text-xs text-theme-text-2">
                Запрос доступа к микрофону и камере…
              </p>
            : null}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {ui.screen === "incoming" ?
                <>
                  <button
                    type="button"
                    disabled={connectingIncomingAnswer}
                    className="rounded-full bg-green-600/90 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-45"
                    onClick={acceptIncomingCall}
                  >
                    Ответить
                  </button>
                  <button
                    type="button"
                    disabled={connectingIncomingAnswer}
                    className="rounded-full bg-red-600/85 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-45"
                    onClick={rejectIncomingCall}
                  >
                    Отклонить
                  </button>
                </>
              : null}
              {(ui.screen === "outgoing" || ui.screen === "live") && (
                <button
                  type="button"
                  className="rounded-full bg-red-600/85 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
                  onClick={() => terminateCallNotify(true)}
                >
                  Завершить
                </button>
              )}
            </div>

            {errorHint ?
              <p className="text-center text-xs text-red-400">
                {errorHint}{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-red-300"
                  onClick={dismissError}
                >
                  Скрыть
                </button>
              </p>
            : null}
          </div>
        </div>
      )}
    </WebRtcCallsContext.Provider>
  );
}
