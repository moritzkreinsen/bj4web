public class Square {
    private int x = 110;
    private int y = 50;
    private int size = 40;
    private String color = "red";
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
    public void changeSize(int value) { size = value; draw(); }

    private void draw() {
        Canvas.update(this, new java.awt.Rectangle(x, y, size, size), color, visible);
    }
}
