"""
Generate VAPID keys for Web Push notifications.
This script generates a pair of VAPID keys (public and private) that are required
for sending push notifications to web browsers.
"""

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

def generate_vapid_keys():
    """Generate VAPID key pair for web push notifications."""
    
    # Generate private key using SECP256R1 (P-256) curve
    private_key = ec.generate_private_key(ec.SECP256R1())
    
    # Get public key from private key
    public_key = private_key.public_key()
    
    # Serialize private key to DER format
    private_der = private_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key to uncompressed point format
    public_der = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # Convert to URL-safe base64 (remove padding)
    private_key_b64 = base64.urlsafe_b64encode(private_der).decode('utf-8').rstrip('=')
    public_key_b64 = base64.urlsafe_b64encode(public_der).decode('utf-8').rstrip('=')
    
    return public_key_b64, private_key_b64

if __name__ == "__main__":
    public_key, private_key = generate_vapid_keys()
    
    print("=" * 80)
    print("VAPID Keys Generated Successfully!")
    print("=" * 80)
    print("\nAdd these to your Vercel environment variables:\n")
    print(f"NEXT_PUBLIC_VAPID_PUBLIC_KEY={public_key}")
    print(f"\nVAPID_PRIVATE_KEY={private_key}")
    print("\n" + "=" * 80)
    print("\nIMPORTANT: Keep the private key secret!")
    print("=" * 80)
