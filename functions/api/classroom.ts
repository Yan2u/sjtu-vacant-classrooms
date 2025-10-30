
export async function onRequestGet(context: any) {
    const CLASSROOM_TYPE_URL = 'https://ids.sjtu.edu.cn/build/findBuildRoomType?buildId={buildingId}&mobileType=mobileFlag'
    const { request } = context
    const url = new URL(request.url)
    const buildingId = url.searchParams.get('buildingId')
    if (!buildingId) {
        return new Response(JSON.stringify({ error: 'Missing buildingId parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }
    try {
        const resp = await fetch(CLASSROOM_TYPE_URL.replace('{buildingId}', buildingId), {
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