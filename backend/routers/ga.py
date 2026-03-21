import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ga_engine import GeneticAlgorithm

router = APIRouter()

@router.post("/run")
async def run_ga(body: dict):
    try:
        ga = GeneticAlgorithm(body)
    except ValueError as e:
        return {"error": str(e)}

    async def stream():
        try:
            async for update in ga.run():
                yield f"data: {json.dumps(update)}\n\n"
        except ValueError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")