const HOSTNAME = 'localhost';
const BACKEND_PORT = '3000';

window.onload = function() {
    document.getElementById('initiate-oauth-button')?.addEventListener('click', () => {
        fetch(buildUrl('initiate-oauth2'), {method: "POST"})
            .then(res => {
                if (res.ok) {
                    // redirect to home page now that user is logged in
                    window.location.replace(buildUrl('home'));
                }
            });
    });
}

function buildUrl(path) {
    return `http://${HOSTNAME}:${BACKEND_PORT}/${path}`;
}