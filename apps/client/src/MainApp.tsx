import { AlertsPage } from "@/components/messenger/AlertsPage";
import { FeedPage } from "@/components/messenger/FeedPage";
import { HashtagFeedPage } from "@/components/messenger/HashtagFeedPage";
import { MessagesPage } from "@/components/messenger/MessagesPage";
import { MessengerSidebar } from "@/components/messenger/MessengerSidebar";
import { MobileNav } from "@/components/messenger/MobileNav";
import { OnboardingModal } from "@/components/messenger/OnboardingModal";
import { ProfilePage } from "@/components/messenger/ProfilePage";
import { SearchPage } from "@/components/messenger/SearchPage";
import { MessageNotificationToast } from "@/components/messenger/MessageNotificationToast";
import { SuccessToast } from "@/components/messenger/SuccessToast";
import { WebRtcCallsProvider } from "@/components/calls/webrtc-call-provider";
import { useAppNavStore } from "@/stores/app-nav-store";
import { usePostCommentsRouteStore } from "@/stores/post-comments-route-store";
import { useDemoNotificationStore } from "@/stores/demo-notification-store";
import { useSessionStore } from "@/stores/session-store";
import { useEffect } from "react";

function MainPanel() {
  const screen = useAppNavStore((s) => s.screen);
  switch (screen) {
    case "search":
      return <SearchPage />;
    case "hashtag-feed":
      return <HashtagFeedPage />;
    case "feed":
      return <FeedPage />;
    case "messages":
      return <MessagesPage />;
    case "alerts":
      return <AlertsPage />;
    case "profile":
    default:
      return <ProfilePage />;
  }
}

export function MainApp() {
  const authSuccessMessage = useSessionStore((s) => s.authSuccessMessage);
  const dismissAuthSuccess = useSessionStore((s) => s.dismissAuthSuccess);
  const demoNotification = useDemoNotificationStore((s) => s.notification);
  const dismissDemoNotification = useDemoNotificationStore((s) => s.dismiss);
  const applyRouteFromLocation = useAppNavStore((s) => s.applyRouteFromLocation);
  const syncPostCommentsFromLocation = usePostCommentsRouteStore(
    (s) => s.syncFromLocation,
  );

  useEffect(() => {
    applyRouteFromLocation();
    syncPostCommentsFromLocation();
    const onPopState = () => {
      applyRouteFromLocation();
      syncPostCommentsFromLocation();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyRouteFromLocation, syncPostCommentsFromLocation]);

  return (
    <WebRtcCallsProvider>
      <div className="relative min-h-dvh w-full max-w-[100vw] bg-theme-bg font-sans text-theme-text antialiased">
      {/*
        Плавающий макет: внешние поля у всего UI, внутри — центрированный ряд
        «сайдбар-карточка + контент», без fixed к краям вьюпорта.
      */}
      <div className="itd-main-shell mx-auto flex min-h-dvh w-full max-w-[100vw] flex-col items-center px-4 pb-28 pt-4 sm:px-6 sm:pb-28 sm:pt-6 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="flex w-full max-w-full flex-col gap-8 lg:mx-auto lg:inline-flex lg:w-fit lg:max-w-none lg:flex-row lg:items-start lg:justify-center lg:gap-6 xl:gap-8">
          <div className="hidden w-64 shrink-0 lg:flex lg:flex-col lg:self-stretch">
            <div className="sticky top-4 z-10 w-full self-start sm:top-6 lg:top-10">
              <MessengerSidebar />
            </div>
          </div>

          <main className="w-full min-w-0 shrink-0 overflow-x-hidden lg:w-[680px] lg:max-w-[680px] lg:pt-1">
            <MainPanel />
          </main>
        </div>
      </div>

      <MobileNav />
      <SuccessToast
        message={authSuccessMessage}
        onDismiss={dismissAuthSuccess}
      />
      <MessageNotificationToast
        notification={demoNotification}
        onDismiss={dismissDemoNotification}
      />
      <OnboardingModal />
      </div>
    </WebRtcCallsProvider>
  );
}
