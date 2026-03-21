# Just includes routers n starts uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import data, ga, results

app = FastAPI(title="ClinkerGA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router,    prefix="/data",    tags=["data"])
app.include_router(ga.router,      prefix="/ga",      tags=["ga"])
app.include_router(results.router, prefix="/results", tags=["results"])

print("main.py accessed")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)