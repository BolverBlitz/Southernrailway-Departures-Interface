# Southernrailway Departures Interface
 Easy to use wrapper that replicated request perfectly and is fast thanks to build in cache.  
 Note: The first request will take a bit longer because it needs to get a PHP session and download the caache.  
 
## Example
```js
const southernrail = new Southernrail();

(async function (){
 try {
   const Output = await southernrail.getDepartures("London Victoria", "Brighton")
   console.log(Output);
 } catch (e) {
   console.log(e)
 }
})();
```
## Methods
setDebug(boolean) - Sets the debug mode  
setApplication(String, String) - Sets the application name and version, used in the user-agent header  
refreshStopsList - Refreshes the in-class stop list cache  
getShortName(String) - Returns the short stop name from the long name  
getLongName(String) - Returns the full stop name from the short name  
  
Quickly search for a stop and return the full stop name (case insensitive) and uses in-class caching  
searchStops(String, Number, Boolean)  
```js
(async function (){
 try {
   const Output = await southernrail.searchStops("London", 5, false)
   console.log(Output); // > [ 'London Euston', 'London Paddington', 'London Bridge' ]
 } catch (e) {
   console.log(e)
 }
```
Get the departures from a stop, you can provide a destination on the same line if you like.  
getDepartures(String, String)  
```js
(async function (){
 try {
   const Output = await southernrail.getDepartures("London Victoria", "Brighton")
   console.log(Output);
 } catch (e) {
   console.log(e)
 }
})();
```
getRideDetails(String) - Get the ride details from a ride ID  
```js
(async function (){
 try {
   const Output = await southernrail.getRideDetails("<A ridKey>")
   console.log(Output);
 } catch (e) {
   console.log(e)
 }
})();
```