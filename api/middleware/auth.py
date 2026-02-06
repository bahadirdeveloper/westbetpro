"""
Supabase Auth Middleware
Admin-only authentication
"""

from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase client for AUTH (uses ANON key for JWT verification)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
)

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verify JWT token from Supabase Auth
    Returns user data if valid
    """
    token = credentials.credentials

    try:
        # Verify token with Supabase
        user = supabase.auth.get_user(token)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials"
            )

        return user

    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


def get_current_user(user = Depends(verify_token)):
    """
    Dependency to get current authenticated user
    """
    return user


def require_admin_role(user = Depends(verify_token)):
    """
    Dependency to require admin role
    Raises 403 if user is not admin or account is inactive
    """
    user_email = user.user.email

    # Import db module
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from db import get_client

    try:
        # Query users table for role
        db = get_client()
        result = db.client.table('users').select('role, is_active').eq(
            'email', user_email
        ).single().execute()

        if not result.data:
            raise HTTPException(
                status_code=403,
                detail="User not found in admin system"
            )

        if not result.data['is_active']:
            raise HTTPException(
                status_code=403,
                detail="User account is inactive"
            )

        if result.data['role'] != 'admin':
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

        # Update last_login timestamp
        db.client.table('users').update({
            'last_login': 'now()'
        }).eq('email', user_email).execute()

        return {**user.user.__dict__, 'role': result.data['role']}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify admin role: {str(e)}"
        )
