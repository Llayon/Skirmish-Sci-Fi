# Plan for Comprehensive UI Responsiveness

**Objective:** To adapt the existing desktop-centric interface of the Five Parsecs Campaign Manager to be fully responsive, functional, and aesthetically pleasing on all screen sizes, from large monitors down to small mobile devices.

**Methodology:** We will employ a **Desktop-Down** (also known as Progressive Degradation) approach. We will start with the current wide-screen layout and introduce cascading adjustments at specific breakpoints for tablet and mobile views. This leverages the existing design while ensuring a quality experience on smaller devices.

---

### **Step 1: Formalize a Unified Responsive Strategy & Breakpoints**

-   **Action:** Define and document the primary breakpoints in a central location (e.g., `tailwind.config.js` or a design system document). While Tailwind provides default breakpoints (`sm`, `md`, `lg`, `xl`), we will standardize our usage.
-   **Details:**
    -   `lg` (1024px): The current primary desktop layout.
    -   `md` (768px): Tablet layout. Key grids will transition from multi-column to simpler two-column or stacked layouts.
    -   `sm` (640px): Mobile layout. Most complex layouts will collapse into a single, vertical column.
-   **Why:** This establishes a consistent foundation for all responsive work, ensuring that developers are targeting the same screen sizes and preventing a fragmented user experience.

**Implementation Notes:**
*   **DONE:** The standard Tailwind CSS breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`) have been formally added to the `tailwind.config` object within `index.html`. This centralizes the breakpoint definitions and makes them available for responsive utility classes throughout the application.

### **Step 2: Adapt the Core `CampaignDashboard.tsx` Grid Layout**

-   **Action:** Modify the `campaign-dashboard-grid` CSS class to create a fluid layout that adapts across breakpoints.
-   **Details:**
    -   **Desktop (`lg`):** Maintain the current five-column grid with `main`, `side`, and `roster` areas.
    -   **Tablet (`md`):** Collapse the grid into two main columns. The `main` content area will occupy one column, and the `side` area will occupy the other. The `roster` will remain full-width below.
    -   **Mobile (`sm`):** Stack all grid areas (`main`, `side`, `roster`) into a single vertical column for easy scrolling.
-   **Why:** The dashboard is the most complex information hub. Adapting its core grid structure is the highest-impact change for improving usability on smaller screens.

**Implementation Notes:**
*   **DONE:** Responsive styles for the `.campaign-dashboard-grid` have been implemented in `index.css` using media queries. The layout correctly transitions from five columns on desktop, to two on tablets, and finally to a single stacked column on mobile, precisely as specified in the plan.

### **Step 3: Reconfigure the `BattleHUD.tsx` for Vertical Stacking**

-   **Action:** Refine the existing media queries for the `battle-hud-grid` to ensure a seamless transition from a spatial overlay on desktop to a stacked, accessible interface on mobile.
-   **Details:**
    -   **Desktop (`lg`):** Keep the current HUD layout, where elements are positioned around the screen's periphery.
    -   **Tablet (`md`):** Condense the layout. Panels like `MissionPanel` and `BattleLog` can be positioned in the top corners, while `CharacterStatus` and `ActionControls` occupy the bottom.
    -   **Mobile (`sm`):** Transform the HUD into a single-column "feed". All components (`ActionQueue`, `MissionPanel`, `CharacterStatus`, `ActionControls`, `BattleLog`) will stack vertically, making the UI part of the main scrollable content rather than an overlay.
-   **Why:** A spatial HUD is unusable on a narrow screen. Stacking the elements makes them readable and interactive without overlap.

**Implementation Notes:**
*   **DONE:** The initial media queries for `.battle-hud-grid` in `index.css` were correct, but a layout issue in the main `App.tsx` component caused the battle grid to have zero height on mobile devices, making it invisible. This has been fixed by converting the main `GameContainer` to a flexbox layout, ensuring the content area correctly expands to fill available space. The `BattleView` now renders correctly on all screen sizes.

### **Step 4: Enhance the Horizontal Scrolling Roster (`CharacterCard.tsx`)**

-   **Action:** Improve the user experience of the horizontally scrolling crew roster within the `CampaignDashboard`.
-   **Details:** The current `overflow-x-auto` is functional but can be improved. Implement CSS scroll-snapping (`scroll-snap-type: x mandatory`) to make scrolling feel more deliberate. On mobile (`sm`), ensure `CharacterCard` components have a minimum width to prevent them from becoming too compressed.
-   **Why:** This prevents the layout from breaking on small screens and makes horizontal scrolling feel like an intentional design choice rather than an overflow issue.

**Implementation Notes:**
*   **DONE:** The horizontally scrolling crew roster in `CampaignDashboard.tsx` has been enhanced for mobile usability. CSS scroll-snapping (`snap-x snap-mandatory`) was added to the scroll container for a more controlled scrolling experience. The `CharacterCard` containers were given a fixed width (`w-80 sm:w-96`) to ensure they maintain a readable size on small screens.

### **Step 5: Implement Responsive Typography and Spacing**

-   **Action:** Audit all major text elements (headings, body copy) and container padding to use Tailwind's responsive variants.
-   **Details:**
    -   Replace static font sizes like `text-3xl` with responsive alternatives (e.g., `text-xl sm:text-2xl lg:text-3xl`).
    -   Review padding and margin utilities (e.g., `p-8`) and adjust them for smaller screens (e.g., `p-4 md:p-6 lg:p-8`).
-   **Why:** This ensures text is always readable and layouts have appropriate white space, preventing text from becoming too large on mobile or too small on desktop.

**Implementation Notes:**
*   **DONE:** Conducted a comprehensive audit of major UI components (`CampaignDashboard`, `CrewCreator`, `PostBattleSequence`, `BattleView`, `CharacterCard`, etc.). Replaced static text size classes (`text-5xl`, `text-3xl`, `text-2xl`, `text-xl`) with responsive variants (e.g., `text-lg sm:text-xl`). This ensures that headings and key data points scale down gracefully on smaller viewports, improving readability and preventing text overflow. Spacing utilities were found to be mostly responsive already (`p-4 sm:p-6`).

### **Step 6: Adapt Modal and Popup Components (`Modal.tsx`, `Tooltip.tsx`)**

-   **Action:** Modify modal and tooltip components to adapt their sizing and behavior for different viewports.
-   **Details:**
    -   **Modals:** On mobile (`sm`), modals should occupy the full width of the screen and a larger portion of the height to maximize content visibility. On desktop, they should remain constrained to a `max-w-lg` or similar.
    -   **Tooltips:** On touch devices, tooltips triggered by hover are ineffective. Investigate converting them to tap-to-show popovers or ensuring the trigger element itself is descriptive enough.
-   **Why:** This is crucial for usability. A desktop-sized modal is often unusable on a mobile screen, and hover-based interactions fail on touch devices.

**Implementation Notes:**
*   **DONE:** The main `Modal.tsx` component has been updated to remove its fixed max-width, allowing the content inside to define its own responsive size. All components that use modals (`InventoryManagementModal`, `SaveGameModal`, etc.) have been updated with responsive width classes on their root `Card` element. Tooltips have been enhanced in `Tooltip.tsx` by adding the `useClick` interaction hook, enabling them to function on tap for touch devices while retaining hover behavior for desktops.

### **Step 7: Refactor Forms and Complex Controls for Mobile**

-   **Action:** Review all components with user input, such as `CrewTasks.tsx`, `UpkeepPanel.tsx`, and the various modals with `<Select>` components.
-   **Details:**
    -   On mobile (`sm`), transition from side-by-side labels and inputs to a stacked layout (label on top of the input).
    -   Ensure `Tabs` components become horizontally scrollable if the triggers overflow on a narrow screen.
-   **Why:** This makes forms and controls easy to read and interact with on a single-column layout, preventing awkward wrapping and horizontal scrolling within the form itself.

### **Step 8: Make `CharacterCard.tsx` and Stat Displays More Compact**

-   **Action:** Create a more compact variant of the `StatDisplay` component and adjust the `CharacterCard` layout for smaller screens.
-   **Details:** The three-column stat grid inside `CharacterCard` will consume too much vertical space on mobile. Transition to a two-column grid (`grid-cols-2`) on `sm` screens to make the cards shorter and more scannable.
-   **Why:** This improves information density and reduces the amount of vertical scrolling required to view the entire crew roster on mobile devices.

### **Step 9: Optimize Performance for Mobile Devices (`MainMenu.tsx`)**

-   **Action:** Conditionally load or disable performance-intensive assets on smaller viewports.
-   **Details:**
    -   The `MainMenu.tsx` features a background video and complex animations (`nebula`, `grid-plane`). Use media queries in CSS or a JavaScript-based check to disable the video and some animations on screens smaller than `md`.
    -   Ensure all buttons and interactive elements have a minimum touch-target size of 44x44px to meet accessibility standards.
-   **Why:** Mobile devices often have less processing power and may be on metered data connections. Optimizing asset loading improves performance and respects the user's resources.

### **Step 10: Conduct Comprehensive Cross-Device Testing and Refinement**

-   **Action:** Systematically test all adapted views using browser developer tools, emulators, and a sample of real physical devices (iOS and Android).
-   **Details:** Create a testing checklist that covers all major components and layouts on each target breakpoint. Pay close attention to touch interactions, layout overflows, and font rendering.
-   **Why:** No responsive adaptation is complete without rigorous testing. This final step catches visual bugs, interaction issues, and ensures a polished, high-quality experience for all users.