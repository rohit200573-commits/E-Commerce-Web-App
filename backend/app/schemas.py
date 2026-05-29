from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
import datetime

# User Schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime.datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    image_url: Optional[str] = None
    category: str
    stock: int = Field(..., ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)

class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

# Order Item Schemas
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: int
    price: float
    product: ProductOut

# Order Schemas
class OrderCreate(BaseModel):
    shipping_address: str = Field(..., min_length=5)
    items: List[OrderItemCreate]

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    status: str
    total_price: float
    shipping_address: str
    created_at: datetime.datetime
    items: List[OrderItemOut]

class OrderStatusUpdate(BaseModel):
    status: str # "Pending", "Processing", "Shipped", "Delivered"
