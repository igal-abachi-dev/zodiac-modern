import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import NeutronStar
Card {
    required property BenchController bench
    property bool encrypt: false
    contentItem: ColumnLayout {
        spacing: 0
        RowLayout {
            spacing: 8
            Image { source: "qrc:/Icons/" + (encrypt ? "lock-keyhole" : "unlock-keyhole") + ".svg"; sourceSize: Qt.size(16,16); Accessible.ignored: true; visible: !Theme.highContrast }
            BenchLabel { text: encrypt ? "Encrypt" : "Decrypt"; font.pixelSize: 16; font.weight: Font.DemiBold }
        }
        BenchLabel { text: "SYNTHETIC INPUT"; font.pixelSize: 10; color: Theme.muted; Layout.topMargin: 20; Layout.bottomMargin: 9 }
        Rectangle {
            Layout.fillWidth: true; Layout.preferredHeight: 94
            color: Theme.inset; radius: 6; border.color: Theme.border
            Column {
                anchors.fill: parent; anchors.margins: 13; spacing: 5
                BenchLabel { width: parent.width; text: encrypt ? "Zodiac GUI benchmark — שלום — 🌠" : "Synthetic sample: starlight.nsx" }
                BenchLabel { visible: !encrypt; text: "No disk file is opened."; font.pixelSize: 12; color: Theme.muted }
            }
        }
        BenchButton {
            Layout.fillWidth: true; Layout.preferredHeight: 40; Layout.topMargin: 16
            text: encrypt ? "Simulate encryption" : "Simulate decryption"
            Accessible.id: encrypt ? "encrypt" : "decrypt"
            primary: encrypt; font.pixelSize: 14
            enabled: bench.ready && !bench.busy
            onClicked: bench.start(encrypt)
        }
    }
}
