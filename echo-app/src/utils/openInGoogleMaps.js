import { Linking, Platform } from 'react-native';

/**
 * Opens a location in Google Maps app or browser fallback.
 * Shows directions from user location to destination without starting navigation.
 *
 * @param {number} destLat - The destination latitude coordinate
 * @param {number} destLng - The destination longitude coordinate
 * @param {Object} userLocation - Optional user location {latitude, longitude}
 */
export const openInGoogleMaps = async (destLat, destLng, userLocation = null) => {
    const label = 'Job Location';

    // If we have user location, show directions (user → destination)
    if (userLocation?.latitude && userLocation?.longitude) {
        const origin = `${userLocation.latitude},${userLocation.longitude}`;
        const destination = `${destLat},${destLng}`;

        // Google Maps directions URL - shows route without starting turn-by-turn
        const googleMapsUrl = Platform.select({
            ios: `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=walking`,
            android: `google.navigation:q=${destLat},${destLng}&mode=w`,
        });

        // Web fallback with directions - walking mode, no auto-start
        const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

        try {
            const canOpen = await Linking.canOpenURL(googleMapsUrl);
            if (canOpen) {
                await Linking.openURL(googleMapsUrl);
            } else {
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            await Linking.openURL(webUrl);
        }
    } else {
        // Fallback: just show the destination point
        const googleMapsUrl = Platform.select({
            ios: `comgooglemaps://?center=${destLat},${destLng}&q=${destLat},${destLng}`,
            android: `geo:${destLat},${destLng}?q=${destLat},${destLng}(${encodeURIComponent(label)})`,
        });

        const webUrl = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;

        try {
            const canOpen = await Linking.canOpenURL(googleMapsUrl);
            if (canOpen) {
                await Linking.openURL(googleMapsUrl);
            } else {
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            await Linking.openURL(webUrl);
        }
    }
};
