const theme = localStorage.getItem("theme");
if (theme) {
    setTheme(theme);
} else {
    const theme = document.querySelector("html").getAttribute("data-theme");

    localStorage.setItem("theme", theme);
    setTheme(theme);
}

const changeThemeButton = document.querySelector(".js-change-theme");
changeThemeButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    setTheme(newTheme);
});

function setTheme(newTheme) {
    const changeThemeButton = document.querySelector(".js-change-theme");
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    const svgSun = changeThemeButton.querySelector(".sun");
    const svgMoon = changeThemeButton.querySelector(".moon");
    if (newTheme === "dark") {
        svgSun.style.display = "block";
        svgMoon.style.display = "none";
    } else {
        svgSun.style.display = "none";
        svgMoon.style.display = "block";
    }

    playgrounds.forEach(playground => {
        playground.setTheme(newTheme);
    });
}
