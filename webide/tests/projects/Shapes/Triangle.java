public class Triangle {
    private int x = 180;
    private int y = 50;
    private int width = 40;
    private int height = 40;
    private String color = "green";
    private boolean visible;

    public void makeVisible() { visible = true; draw(); }
    public void makeInvisible() { visible = false; draw(); }
    public void moveHorizontal(int distance) { x += distance; draw(); }
    public void moveVertical(int distance) { y += distance; draw(); }
    public void moveRight() { moveHorizontal(20); }
    public void moveLeft() { moveHorizontal(-20); }
    public void moveUp() { moveVertical(-20); }
    public void moveDown() { moveVertical(20); }
    public void changeColor(String value) { color = value; draw(); }
    public void changeSize(int newHeight, int newWidth) { height = newHeight; width = newWidth; draw(); }

    private void draw() {
        Canvas.update(this, new java.awt.Polygon(new int[]{x, x + width / 2, x + width}, new int[]{y + height, y, y + height}, 3), color, visible);
    }
}
