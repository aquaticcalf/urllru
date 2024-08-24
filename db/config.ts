import { column, defineDb, defineTable } from "astro:db"

const Link = defineTable({
  columns: {
    short: column.text({ primaryKey: true }),
    original: column.text()
  }
})

export default defineDb({
  tables: {
    Link
  },
})