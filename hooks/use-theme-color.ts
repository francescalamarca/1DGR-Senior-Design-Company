/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 * 
 * colorName. keyof typeof Colors.light means "only accept strings that are valid 
 * keys of the Colors.light object" 
 * 
 * first prop being passed in = props, can be either dark or light, ?? = neither is required
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark //must be valid in both light and dark
) {
  const theme = useColorScheme() ?? 'light'; //goes default into light mode when useColorScheme is null
  const colorFromProps = props[theme]; //checks if you passed a custom color

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName]; //falls back to the theme that is set
  }
}
