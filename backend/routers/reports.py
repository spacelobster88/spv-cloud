"""Report generation endpoints."""

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from reports.monthly_report import MonthlyReportGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])

# Resolve paths relative to the backend directory
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DATA_PATH = _BACKEND_DIR / "data" / "vehicles.json"
_OUTPUT_DIR = _BACKEND_DIR / "reports" / "output"


@router.post("/monthly")
async def generate_monthly_report(
    year: int = Query(..., ge=2000, le=2100, description="Report year"),
    month: int = Query(..., ge=1, le=12, description="Report month (1-12)"),
) -> FileResponse:
    """Generate and return a monthly report as a downloadable Word document."""
    try:
        generator = MonthlyReportGenerator(
            data_path=str(_DATA_PATH),
            output_dir=str(_OUTPUT_DIR),
        )
        output_path = generator.generate(year=year, month=month)
    except FileNotFoundError as exc:
        logger.error("Data file not found: %s", exc)
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception:
        logger.exception("Failed to generate monthly report")
        raise HTTPException(status_code=500, detail="Report generation failed.")

    filename = output_path.name
    return FileResponse(
        path=str(output_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )
