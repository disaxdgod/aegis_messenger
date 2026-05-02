import { useEffect } from "react";
import type { UserDTO } from "@aegis/shared";

function App() {
  useEffect(() => {
    const testUser: UserDTO = {
      id: "007",
      username: "Agent_Aegis",
      createdAt: new Date().toISOString(),
    };

    console.log("🛡️ Aegis Client запущен!");
    console.log("🔗 СВЯЗЬ УСТАНОВЛЕНА! Данные из пакета Shared:", testUser);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121212",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <p>Система готова к работе.</p>
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          border: "1px solid #333",
          borderRadius: "8px",
          backgroundColor: "#1a1a1a",
        }}
      ></div>
    </div>
  );
}

export default App;
