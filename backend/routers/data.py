from fastapi import APIRouter
from db import supabase

print("data.py accessed")
router = APIRouter()

@router.get("/presets")
def get_presets():
    return supabase.table("presets").select("*").execute().data

@router.get("/prod-units")
def get_prod_units(preset: str):
    return supabase.table("production_units").select("*").eq("preset", preset).execute().data

@router.get("/grind-units")
def get_grind_units(preset: str):
    return supabase.table("grinding_units").select("*").eq("preset", preset).execute().data

@router.get("/routes")
def get_routes(preset: str):
    return supabase.table("routes").select("*").eq("preset", preset).execute().data

# CRUD for prod_units
@router.post("/prod-units")
def create_prod_unit(body: dict):
    return supabase.table("production_units").insert(body).execute().data

@router.patch("/prod-units/{id}")
def update_prod_unit(id: str, body: dict):
    return supabase.table("production_units").update(body).eq("id", id).execute().data

@router.delete("/prod-units/{id}")
def delete_prod_unit(id: str):
    return supabase.table("production_units").delete().eq("id", id).execute().data

# CRUD for grind_units
@router.post("/grind-units")
def create_grind_unit(body: dict):
    return supabase.table("grinding_units").insert(body).execute().data

@router.patch("/grind-units/{id}")
def update_grind_unit(id: str, body: dict):
    return supabase.table("grinding_units").update(body).eq("id", id).execute().data

@router.delete("/grind-units/{id}")
def delete_grind_unit(id: str):
    return supabase.table("grinding_units").delete().eq("id", id).execute().data

# CRUD for routes
@router.post("/routes")
def create_route(body: dict):
    return supabase.table("routes").insert(body).execute().data

@router.patch("/routes/{id}")
def update_route(id: str, body: dict):
    return supabase.table("routes").update(body).eq("id", id).execute().data

@router.delete("/routes/{id}")
def delete_route(id: str):
    return supabase.table("routes").delete().eq("id", id).execute().data