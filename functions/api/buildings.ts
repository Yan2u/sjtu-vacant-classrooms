
export async function onRequestGet(context: any) {
    const GET_BUILD_ID_URL = 'https://ids.sjtu.edu.cn/build/findAreaBuild?schoolArea=0'
    try {
        const resp = await fetch(GET_BUILD_ID_URL, {
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