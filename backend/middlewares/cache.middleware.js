export const cacheControl = (maxAge = 0, options = {}) => {
    return (req, res, next) => {
        if (maxAge > 0) {
            res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`);
        } else {
            res.set('Cache-Control', 'no-store');
        }
        next();
    }
}
// A small Express middleware that attaches a Cache-Control header to HTTP responses.

// When frontend calls /api/users, the browser receives the response along with a 
// header like Cache-Control: public, max-age=60. This tells the browser - 
// "you can reuse this response for 60sec without making a new network request."
// If the data changes, the browser will make a new request to the server.

// stale-while-revalidate=60 means — even after the 60s expires, 
// the browser can still show the old data *while quietly fetching 
// fresh data in the background. The user sees something instantly rather than a loading spinner.

// no-store on the other routes (messages, conversations, auth) means — 
// never cache this, always go to the server. This is critical for real-time data. 
// You never want a cached version of your messages showing up.