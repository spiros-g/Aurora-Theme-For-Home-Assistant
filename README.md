Aurora Theme for Home Assistant offers a sleek, modern aesthetic with a focus on glass-like transparency and dynamic background animations. Designed to enhance your Home Assistant interface, this theme includes subtle gradients, transparent overlays, and refined card styles for a visually appealing experience. The theme features adjustable header height, a customizable sidebar, and elegant color schemes to match your preferences.

**Features:**
- Glass-like transparency and blur effects
- Customizable header height and card styles
- Optimized sidebar and interactive elements
- Integrated background animations

**Installation:**
1. **Copy the Theme Configuration:**
   - Save the theme configuration as `aurora-theme.yaml` or another preferred name in your Home Assistant `themes` directory.

2. **Add the Theme to Home Assistant:**
   - In `configuration.yaml`, include all theme configuration files by adding the following:
     ```yaml
     frontend:
       themes: !include_dir_merge_named themes
     ```

3. **Load Background Animations:**
   - Place the `background-animations.js` file in the `www` folder of your Home Assistant setup. Ensure the path is `/homeassistant/www/background-animations.js`.

4. **Activate the Background Animations Resource:**
   - Go to **Settings > Dashboards > Resources** in Home Assistant.
   - Click on **"Add Resource"**.
   - Enter the path to the JavaScript file: `/local/background-animations.js`.
   - Set the resource type to **JavaScript Module**.
   - Click **"Save"**.

5. **Apply the Theme:**
   - In Home Assistant, go to your user profile and select the "Aurora" theme from the "Themes" dropdown menu.
