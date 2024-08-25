import type { APIRoute } from "astro"
import { Link, db, eq, isDbError } from "astro:db"
import { z } from "zod"

export const POST: APIRoute = async ({ request }) => {
  try {
    const requestBody = await request.text()

    const params = new URLSearchParams(requestBody)
    let short = params.get('short')

    if (!short) {
      return new Response('short identifier is missing', { status: 400 })
    }

    short = short.trim().replace(/\//g, '').slice(-7)

    const shortValidation = z.string().length(7).regex(/^[a-zA-Z0-9]+$/).safeParse(short)
    if (!shortValidation.success) {
      return new Response(`invalid short identifier: ${JSON.stringify(shortValidation.error.issues)}`, { status: 400 })
    }

    const link = await db.select().from(Link).where(eq(Link.short, shortValidation.data))
    if (link.length > 0) {
      return new Response(link[0].original, { status: 200 })
    } else {
      return new Response("short identifier not found", { status: 404 })
    }
  } catch (error) {
    if (isDbError(error)) {
      return new Response(`error while querying database: ${error.message}`, { status: 500 })
    }
    return new Response(`unknown error occurred: ${error}`, { status: 500 })
  }
}