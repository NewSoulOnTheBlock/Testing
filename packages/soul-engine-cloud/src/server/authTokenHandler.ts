import { Hono } from "hono"
import { issueTokenForEngine } from "@opensouls/soul"
import { logger } from "../logger.ts"

const requiredEnv = [
  "SOUL_ENGINE_JWT_PRIVATE_KEY",
  "SOUL_ENGINE_JWT_ISSUER",
  "SOUL_ENGINE_ORGANIZATION",
  "SOUL_ENGINE_BLUEPRINT",
] as const

type RequiredEnvKey = (typeof requiredEnv)[number]

const getEnv = (key: RequiredEnvKey): string => {
  return process.env[key] ?? ""
}

export const authTokenHandler = (app: Hono<any>) => {
  app.post("/auth/token", async (c) => {
    try {
      const payload = await c.req.json().catch(() => ({}))
      const soulId = typeof payload?.soulId === "string" ? payload.soulId.trim() : ""

      if (!soulId) {
        return c.json({ error: "Missing soulId" }, 400)
      }

      const missing = requiredEnv.filter((key) => !getEnv(key))
      if (missing.length > 0) {
        logger.error("auth token env missing", { missing })
        return c.json({ error: "Server missing auth configuration" }, 500)
      }

      const token = await issueTokenForEngine({
        privateKey: getEnv("SOUL_ENGINE_JWT_PRIVATE_KEY"),
        issuer: getEnv("SOUL_ENGINE_JWT_ISSUER"),
        organization: getEnv("SOUL_ENGINE_ORGANIZATION"),
        blueprint: getEnv("SOUL_ENGINE_BLUEPRINT"),
        soulId,
      })

      return c.json({ token }, 200)
    } catch (error) {
      logger.error("auth token generation failed", { error })
      return c.json({ error: "Failed to generate token" }, 500)
    }
  })
}
