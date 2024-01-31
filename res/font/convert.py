from PIL import Image

for i in range(32, 127):
    print(f"converting {i}.png...")
    # Import an image from directory:
    input_image = Image.open(f"{i}.png")
    pixel_map = input_image.load()
    width, height = input_image.size
    for x in range(width):
        for y in range(height):
            r, g, b, p = input_image.getpixel((x, y))
            if (r, g, b, p) == (0, 0, 0, 255):
                r, g, b, p = 255, 255, 255, 255
            pixel_map[x, y] = (r, g, b, p)

    input_image.save(f"{i}.png", format="png")
    print(f"done converting {i}.png")