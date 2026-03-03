/*
app directory: A special directory containing only routes and their layouts. 
Any files added to this directory become a screen inside our native app and a page on the web.

this file name does not add a route it points to the parent, /
a route file exports a React component as its default value. 
(It can use either .js, .jsx, .ts, or .tsx extension.)

We'll use Expo Router's Link component to navigate from the /index route to the /about route. 
It is a React component that renders a <Text> with a given href prop.

*/

import { Redirect } from "expo-router";

export default function HomeUserIndex() {
  return <Redirect href="/(companyUser)/explore" />;
}