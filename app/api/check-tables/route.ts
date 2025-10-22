import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 500 })
    }

    console.log("[v0] Checking database tables...")

    const tables = ["delegates", "proposals", "push_subscriptions", "notification_preferences", "notifications"]
    const results: Record<string, { exists: boolean; error?: string }> = {}

    for (const table of tables) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        })

        if (response.ok) {
          console.log(`[v0] Table ${table}: EXISTS`)
          results[table] = { exists: true }
        } else {
          const errorText = await response.text()
          console.log(`[v0] Table ${table}: ERROR - ${errorText}`)
          results[table] = { exists: false, error: errorText }
        }
      } catch (err) {
        console.log(`[v0] Table ${table}: ERROR - ${err}`)
        results[table] = { exists: false, error: String(err) }
      }
    }

    const allExist = Object.values(results).every((r) => r.exists)

    console.log("[v0] Table check complete:", JSON.stringify(results, null, 2))

    return NextResponse.json({
      success: allExist,
      tables: results,
      message: allExist ? "All required tables exist" : "Some tables are missing - please run the migration scripts",
    })
  } catch (error) {
    console.error("[v0] Error checking tables:", error)
    return NextResponse.json({ error: "Failed to check tables", details: String(error) }, { status: 500 })
  }
}
