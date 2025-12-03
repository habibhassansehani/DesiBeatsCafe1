# Design Guidelines: Desi Beats Café POS System

## Design Approach

**System Selected: Custom POS-Optimized Design System**

This is a utility-focused, function-differentiated application where efficiency and usability are paramount. The design follows established POS interface patterns optimized for fast-paced restaurant operations with touch-first interactions.

**Key Design Principles:**
- Speed over aesthetics: Minimize clicks and cognitive load
- Touch-optimized: All interactive elements sized for finger touch
- Clear hierarchy: Critical information immediately visible
- Status clarity: Color-coded visual indicators throughout
- Role-specific optimization: Different interfaces for different users

---

## Typography

**Font Family:**
- Primary: Inter or system-ui for maximum legibility
- Monospace: Use for order numbers, table numbers, prices

**Type Scale:**
- Hero numbers (prices, totals): text-4xl to text-5xl, font-bold
- Section headers: text-2xl, font-semibold
- Product names: text-lg, font-medium
- Body text: text-base
- Labels/metadata: text-sm
- Small print (receipts): text-xs

**Critical Rule:** All text must be highly legible - avoid light weights below 400.

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (within cards)
- Standard spacing: p-4, gap-4 (between elements)
- Section spacing: p-6, p-8 (major sections)
- Large spacing: p-12, p-16 (page margins on desktop)

**Grid System:**
- Product grid: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- Table layout: CSS Grid with auto-fit for responsive table arrangement
- Dashboard cards: 2-4 column grid based on screen size

**Layout Structure:**
- Sidebar navigation (persistent, 64px collapsed / 240px expanded)
- Top bar: User info, active table/order indicator, quick actions
- Main content area: Full remaining width
- Right sidebar (contextual): Order summary, cart (320px)

---

## Core Components

### Navigation
- Vertical sidebar with icons and text labels
- Active state: Bold background indicator
- Sections: POS, Tables, Kitchen, Admin, Reports, Settings
- Role-based visibility: Show only relevant sections per user role

### Product Selection Interface
**Category Bar:**
- Horizontal scrollable tabs
- Each category: min-width of 120px, p-4
- Active category: Strong visual indicator

**Product Grid:**
- Card-based layout with image, name, price
- Each card: min-height 120px, touch-friendly
- Quick add button: Large, prominent
- Out-of-stock: Grayed out with overlay indicator

### Table Management
**Visual Grid:**
- Each table: Square/rounded cards (120-150px)
- Status indicators via border and icon
- Table number: Large, centered
- Active orders count: Badge on corner
- Drag-and-drop capable zones

### Order Interface
**Order Builder (Left/Center):**
- Category → Product selection
- Search bar: Sticky top, prominent
- Recently added: Quick-access strip

**Order Summary (Right Sidebar):**
- Line items: Name, quantity controls, price
- Each item editable: +/- buttons, remove icon, notes field
- Subtotal, tax, total: Large, bold display
- Payment/action buttons: Fixed bottom, full-width

### Payment Modal
- Large modal (600px wide)
- Payment method selection: Large icon buttons in grid
- Amount display: Huge, centered
- Calculator interface: Number pad for cash input
- Split payment: Toggle to enable multiple methods

### Kitchen Display System (KDS)
**Order Cards:**
- Large cards (300-400px wide)
- Order number: Huge, top-left
- Items list: Large text, checkable
- Timer: Countdown from order creation
- Status buttons: "Ready", "Served" - large, prominent

### Admin Panel
**Table/Grid Views:**
- Data tables with sorting, filtering
- Row actions: Edit, delete icons
- Bulk actions: Checkbox selection
- Forms: Clear labels, generous spacing
- Image uploads: Drag-drop zones

### Dashboard
**Stat Cards:**
- Large numbers with labels
- Icon indicators
- Comparison indicators (vs yesterday/last week)

**Charts:**
- Line charts for sales trends
- Bar charts for category performance
- Pie/donut for payment method breakdown
- Minimal decoration, focus on data

---

## Touch Interactions

**Button Sizing:**
- Minimum: 44x44px (iOS standard)
- Recommended: 56x56px or larger for primary actions
- Grid product cards: 120x120px minimum

**Tap Targets:**
- All interactive elements: Minimum 8px padding
- Spacing between: Minimum 8px gap
- Quantity controls: Large +/- buttons (48x48px)

**Feedback:**
- Active state: Scale down slightly (scale-95)
- Loading states: Spinner or skeleton
- Success actions: Brief animation or checkmark
- Errors: Inline, near point of error

---

## Status Indicators

**Color Coding System** (semantic usage):
- Available/Success: Green treatment
- Warning/Pending: Yellow/amber treatment
- Occupied/Active: Blue treatment
- Billed/Urgent: Red/orange treatment
- Disabled/Cancelled: Gray treatment

**Application:**
- Table status: Border and background tint
- Order status: Badge with icon
- Payment status: Dot indicator
- Stock status: Overlay on product cards

---

## Role-Specific Interfaces

**Cashier:** Streamlined POS with product selection + payment
**Waiter:** Table selection + order creation + status updates
**Kitchen Staff:** Order queue (KDS) only
**Admin:** Full access to settings, reports, configuration

Each role sees a simplified version focused on their workflow.

---

## Responsive Considerations

**Desktop (1280px+):** Full layout with sidebars
**Tablet (768-1279px):** Collapsible sidebar, full order interface
**Mobile (< 768px):** Bottom navigation, full-screen views, simplified flows

**Touch Optimization:** All tap targets 56px+ on mobile devices

---

## Animations

**Minimal Usage:**
- Page transitions: Simple fade (150ms)
- Modal entrance: Slide up (200ms)
- Success feedback: Checkmark animation (300ms)
- NO: Complex hover effects, parallax, decorative animations

---

## Print Styles (Receipts)

- Monospace font for alignment
- Clear sections with borders
- Logo at top (if available)
- QR code support for digital receipt
- 80mm thermal printer optimized (58mm fallback)