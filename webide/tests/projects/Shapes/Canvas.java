import java.awt.*;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.swing.*;

/** Shared drawing surface for the classroom shapes. */
public final class Canvas {
    private record Drawing(Shape shape, Color color) {}
    private static final Map<Object, Drawing> drawings = new LinkedHashMap<>();
    private static JInternalFrame window;
    private static final JPanel paper = new JPanel() {
        @Override protected void paintComponent(Graphics graphics) {
            super.paintComponent(graphics);
            Graphics2D g = (Graphics2D) graphics;
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            for (Drawing drawing : drawings.values()) {
                g.setColor(drawing.color());
                g.fill(drawing.shape());
            }
        }
    };

    static void update(Object owner, Shape shape, String color, boolean visible) {
        try {
            SwingUtilities.invokeAndWait(() -> {
                if (visible) drawings.put(owner, new Drawing(shape, color(color)));
                else drawings.remove(owner);
                if (window == null || window.isClosed()) {
                    if (!visible) return;
                    window = new JInternalFrame("Shapes");
                    paper.setPreferredSize(new Dimension(360, 240));
                    paper.setBackground(Color.WHITE);
                    window.setContentPane(paper);
                    window.pack();
                    window.setVisible(true);
                }
                paper.repaint();
            });
        } catch (Exception error) { throw new IllegalStateException(error); }
    }

    private static Color color(String name) {
        return switch (name) {
            case "red" -> Color.RED;
            case "blue" -> Color.BLUE;
            case "green" -> Color.GREEN;
            case "yellow" -> Color.YELLOW;
            case "black" -> Color.BLACK;
            case "white" -> Color.WHITE;
            default -> throw new IllegalArgumentException(name);
        };
    }
}
