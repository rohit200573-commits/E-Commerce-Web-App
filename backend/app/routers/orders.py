from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user, get_admin_user

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not order_in.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item."
        )

    # We will compute order items and verify stock
    db_items = []
    total_price = 0.0

    try:
        for item in order_in.items:
            # Fetch product and lock row for stock update
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with id {item.product_id} not found."
                )
                
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Available: {product.stock}, Requested: {item.quantity}."
                )

            # Deduct stock
            product.stock -= item.quantity
            item_price = product.price * item.quantity
            total_price += item_price

            db_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                price=product.price # Save price at purchase time
            )
            db_items.append(db_item)

        # Create Order object
        db_order = models.Order(
            user_id=current_user.id,
            status="Pending",
            total_price=total_price,
            shipping_address=order_in.shipping_address,
            items=db_items
        )

        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during checkout: {str(e)}"
        )

@router.get("/my", response_model=List[schemas.OrderOut])
def get_my_orders(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).order_by(models.Order.created_at.desc()).all()
    return orders

@router.get("", response_model=List[schemas.OrderOut])
def get_all_orders(
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    return orders

@router.patch("/{order_id}", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    admin_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    valid_statuses = ["Pending", "Processing", "Shipped", "Delivered"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {valid_statuses}."
        )

    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    db_order.status = status_update.status
    db.commit()
    db.refresh(db_order)
    return db_order
