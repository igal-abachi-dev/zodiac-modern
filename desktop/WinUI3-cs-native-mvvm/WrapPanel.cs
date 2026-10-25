using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Windows.Foundation;

namespace NeutronStar.WinUINative;

// Layout only: the children remain ordinary Fluent controls.
public sealed class WrapPanel : Panel
{
    private const double Gap = 8;

    protected override Size MeasureOverride(Size availableSize)
    {
        double limit = double.IsInfinity(availableSize.Width) ? double.MaxValue : availableSize.Width;
        double x = 0, y = 0, rowHeight = 0, maximum = 0;
        foreach (var child in Children)
        {
            child.Measure(new Size(limit, availableSize.Height));
            var desired = child.DesiredSize;
            if (x > 0 && x + desired.Width > limit)
            {
                maximum = Math.Max(maximum, x - Gap);
                x = 0;
                y += rowHeight + Gap;
                rowHeight = 0;
            }
            x += desired.Width + Gap;
            rowHeight = Math.Max(rowHeight, desired.Height);
        }
        return new Size(Math.Min(limit, Math.Max(maximum, Math.Max(0, x - Gap))), y + rowHeight);
    }

    protected override Size ArrangeOverride(Size finalSize)
    {
        double x = 0, y = 0, rowHeight = 0;
        foreach (var child in Children)
        {
            var desired = child.DesiredSize;
            double width = Math.Min(finalSize.Width, desired.Width);
            if (x > 0 && x + width > finalSize.Width)
            {
                x = 0;
                y += rowHeight + Gap;
                rowHeight = 0;
            }
            child.Arrange(new Rect(x, y, width, desired.Height));
            x += width + Gap;
            rowHeight = Math.Max(rowHeight, desired.Height);
        }
        return finalSize;
    }
}
