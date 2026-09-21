import sys
import io
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_webp.py <input_path> <output_path> [quality]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    quality = int(sys.argv[3]) if len(sys.argv) > 3 else 85

    try:
        img = Image.open(input_path)
        # Convert RGBA or RGB if necessary
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA')
        img.save(output_path, format='WEBP', quality=quality)
        print(f"OK:{img.width}:{img.height}")
    except Exception as e:
        print(f"ERROR:{e}")
        sys.exit(2)

if __name__ == '__main__':
    main()
