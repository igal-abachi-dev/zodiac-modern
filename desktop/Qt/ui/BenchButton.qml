import NeutronStar
import QtQuick
import QtQuick.Controls.Basic
Button {
    id: control
    property bool primary: false
    font.family: "Inter"
    font.pixelSize: 12
    padding: 13
    topPadding: 0; bottomPadding: 0
    font.weight: Font.Medium
    implicitHeight: 40
    Accessible.name: text
    Accessible.onShowOnScreenAction: control.Window.window.reveal(control)
    onActiveFocusChanged: if (activeFocus) control.Window.window.reveal(control)
    background: Rectangle {
        radius: 8
        color: control.primary ? Theme.accent : (control.down && !Theme.highContrast ? "#e4eae6" : Theme.surface)
        opacity: control.enabled ? 1 : 0.55
        border.color: control.activeFocus ? Theme.accent : Theme.border
        border.width: control.activeFocus ? 2 : 1
    }
    contentItem: Text {
        text: control.text; font: control.font
        color: control.primary ? Theme.onAccent : Theme.text
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        opacity: control.enabled ? 1 : 0.55
    }
}
