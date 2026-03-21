from fastapi import APIRouter
from db import supabase
print("results.py accessed")
router = APIRouter()

@router.get("/")
def get_results():
    return supabase.table("results").select("id, run_at, preset, total_cost, best_fitness, ga_params").order("run_at", desc=True).execute().data

@router.get("/{id}")
def get_result(id: str):
    return supabase.table("results").select("*").eq("id", id).execute().data[0]

@router.delete("/{id}")
def delete_result(id: str):
    return supabase.table("results").delete().eq("id", id).execute().data