import QtQuick
import QtQuick.Controls.Basic
import QtQuick.Layouts
import NeutronStar
Column {
    id: root
    required property BenchController bench
    signal back()
    spacing: 16
    GridLayout {
        width: root.width; columns: root.width < 704 ? 1 : 2; rowSpacing: 12; columnSpacing: 16
        ColumnLayout { Layout.fillWidth: true; spacing: 8
            BenchLabel { Layout.fillWidth: true; text: "List and filter workbench"; font.pixelSize: 22; font.weight: Font.DemiBold }
            BenchLabel { Layout.fillWidth: true; text: "Deterministic synthetic rows. No files, network, cryptography or native commands."; color: Theme.muted }
        }
        BenchButton { text: "Back to main screen"; Layout.alignment: Qt.AlignTop; onClicked: root.back() }
    }
    BenchLabel { text: "Workbench ready" }
    Flow {
        width: root.width; spacing: 8
        BenchButton { text: "1,000 rows"; onClicked: bench.replaceRows(1000) }
        BenchButton { text: "10,000 rows"; onClicked: bench.replaceRows(10000) }
        BenchButton { text: "Reverse"; onClicked: bench.reverseRows() }
        BenchButton { text: "Splice 10"; onClicked: bench.spliceRows() }
        BenchButton { text: "Update 10%"; onClicked: bench.updateRows() }
        Repeater { model: [10,30,60]; BenchButton { required property int modelData; text: modelData + " Hz / 2 s"; onClicked: bench.burst(modelData) } }
        BenchButton { text: "Stop"; Accessible.description: bench.active ? "Updates active" : "Updates stopped"; onClicked: bench.stop() }
        BenchButton { text: "Remount workload"; onClicked: bench.remount() }
    }
    Card {
        width: root.width
        contentItem: ColumnLayout {
            spacing: 10
            BenchLabel { id: queryLabel; text: "Filter synthetic rows"; Accessible.labelFor: query }
            TextField {
                id: query; Layout.fillWidth: true; text: bench.query
                Accessible.name: "Filter synthetic rows"; Accessible.id: "workload-query"
                Accessible.labelledBy: queryLabel
                // Accessible ValuePattern edits must update the model too.
                onTextChanged: if(text !== bench.query) bench.setQuery(text)
                onActiveFocusChanged: if(activeFocus) query.Window.window.reveal(query)
                Accessible.onShowOnScreenAction: query.Window.window.reveal(query)
                font.family: "Inter"; font.pixelSize: 14; selectByMouse: true
                Layout.preferredHeight: 40; leftPadding: 12; rightPadding: 12
                palette.highlight: Theme.accent; palette.highlightedText: Theme.onAccent
            }
            BenchLabel { text: bench.summary; Accessible.id: "workload-summary" }
            BenchLabel { Layout.fillWidth: true; text: "Case-sensitive label filtering. Replacement advances row IDs; remount resets IDs, query and tick."; font.pixelSize: 12; color: Theme.muted }
        }
    }
    Column {
        width: root.width
        Accessible.role: Accessible.List; Accessible.name: "Synthetic rows"; Accessible.id: "workload-rows"
        // Repeater, not ListView: materialize the complete unvirtualized workload.
        Repeater {
            model: bench.rows
            delegate: Rectangle {
                required property int rowKey
                required property string displayText
                width: root.width; height: 34; color: Theme.surface; border.color: Theme.border
                BenchLabel { anchors.fill: parent; anchors.leftMargin: 12; verticalAlignment: Text.AlignVCenter; text: parent.displayText; Accessible.id: "row-" + parent.rowKey }
            }
        }
    }
}
