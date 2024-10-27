const HOSTNAME = 'localhost';
const BACKEND_PORT = '3000';

window.onload = function() {
    document.getElementById('logout')?.addEventListener('click', () => {
        fetch(buildUrl('logout'), {method: "POST"})
            .then(res => {
                if (res.ok) {
                    // redirect to login page now that user is logged out
                    window.location.replace(buildUrl('login'));
                }
            });
    });
}

function buildUrl(path) {
    return `http://${HOSTNAME}:${BACKEND_PORT}/${path}`;
}