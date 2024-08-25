import type { APIRoute } from "astro"
import { Link, db, eq, isDbError } from "astro:db"
import { customAlphabet } from "nanoid"
import { z } from "zod"

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()
  const originalUrluntrimmed = formData.get("original") as string | null

  const originalUrl = originalUrluntrimmed?.trim().replace(/\/+$/, "")

  const urlValidation = z.string().url().safeParse(originalUrl)
  if (!urlValidation.success) {
    return new Response(`invalid url: ${urlValidation.error.message}`, { status: 400 })
  }

  const url = new URL(urlValidation.data)

  if (url.hostname === "urllru.vercel.app") {
    return new Response("cannot shorten urls from the same domain to prevent recursion.", { status: 400 })
  }

  try {
    const existingLink = await db.select().from(Link).where(eq(Link.original, urlValidation.data))
    if (existingLink.length > 0) {
      return new Response(existingLink[0].short, { status: 200 })
    }
  } catch (error) {
    if (isDbError(error)) {
      return new Response(`error while querying database: ${error.message}`, { status: 500 })
    }
    return new Response(`unknown error occurred: ${error}`, { status: 500 })
  }

  const generateShortId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 7)
  let shortId = ""
  let isUnique = false

  while (!isUnique) {
    shortId = generateShortId()

    try {
      const existingLinks = await db.select().from(Link).where(eq(Link.short, shortId))
      if (existingLinks.length === 0) {
        isUnique = true
      }
    } catch (error) {
      if (isDbError(error)) {
        return new Response(`error while querying database: ${error.message}`, { status: 500 })
      }
      return new Response(`unknown error occurred: ${error}`, { status: 500 })
    }
  }

  try {
    await db.insert(Link).values({ original: urlValidation.data, short: shortId })
  } catch (error) {
    if (isDbError(error)) {
      return new Response(`cannot insert new link with id ${shortId}: ${error.message}`, { status: 500 })
    }
    return new Response(`unknown error occurred: ${error}`, { status: 500 })
  }

  return new Response(shortId, { status: 200 })
}