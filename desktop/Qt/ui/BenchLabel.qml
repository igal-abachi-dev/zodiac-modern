import NeutronStar
import QtQuick
import QtQuick.Controls.Basic
Label {
    color: Theme.text
    font.family: "Inter"
    font.pixelSize: 14
    lineHeightMode: Text.FixedHeight
    lineHeight: font.pixelSize * (font.pixelSize === 24 ? 1.3 : 1.5)
    wrapMode: Text.Wrap
    Accessible.role: Accessible.StaticText
    Accessible.name: text
}
