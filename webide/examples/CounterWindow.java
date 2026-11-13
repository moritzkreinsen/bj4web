import javax.swing.*;

public class CounterWindow {
    public static JInternalFrame create() throws Exception {
        JInternalFrame[] result = new JInternalFrame[1];
        SwingUtilities.invokeAndWait(() -> {
            JInternalFrame window = new JInternalFrame("Counter");
            JPanel panel = new JPanel();
            JLabel label = new JLabel("0");
            JButton button = new JButton("+1");
            button.addActionListener(event -> label.setText(Integer.toString(Integer.parseInt(label.getText()) + 1)));
            panel.add(label);
            panel.add(button);
            window.setContentPane(panel);
            result[0] = window;
        });
        return result[0];
    }
}
