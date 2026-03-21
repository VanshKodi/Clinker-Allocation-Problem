import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ga_engine import GeneticAlgorithm

router = APIRouter()

@router.post("/run")
async def run_ga(body: dict):
    ga = GeneticAlgorithm(body)

    async def stream():
        async for update in ga.run():
            yield f"data: {json.dumps(update)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")