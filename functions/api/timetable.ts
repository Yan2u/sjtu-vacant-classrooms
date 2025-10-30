
export async function onRequestGet(context: any) {
    const TIMETABLE_URL = 'https://ids.sjtu.edu.cn/course/findSection'
    try {
        const resp = await fetch(TIMETABLE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        if (!resp.ok) {
            throw new Error(`Error: ${resp.status} ${resp.statusText}`);
        }

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        const res = await resp.text()
        return new Response(res, { status: 200, headers })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: `Failed to fetch timetable: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}