import NeutronStar
import QtQuick
import QtQuick.Controls.Basic
Button {
    id: control
    property bool primary: false
    property url glyph: ""
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
    contentItem: Item {
        implicitWidth: caption.implicitWidth + (glyphImage.visible ? 24 : 0)
        implicitHeight: Math.max(caption.implicitHeight, glyphImage.visible ? 16 : 0)
        opacity: control.enabled ? 1 : 0.55
        Row { anchors.centerIn: parent; spacing: 8
            Image { id: glyphImage; source: control.glyph; visible: control.glyph.toString().length > 0 && !Theme.highContrast; width: 16; height: 16; sourceSize: Qt.size(16,16); anchors.verticalCenter: parent.verticalCenter; Accessible.ignored: true }
            Text { id: caption; text: control.text; font: control.font; color: control.primary ? Theme.onAccent : Theme.text; verticalAlignment: Text.AlignVCenter }
        }
    }
}
