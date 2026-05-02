// apps/server/src/index.ts
import { UserDTO } from "@aegis/shared";

const testUser: UserDTO = {
  id: "1",
  username: "mentor",
  createdAt: new Date().toISOString(),
};

console.log("Setup works!", testUser);
