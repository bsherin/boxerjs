
export {container_kinds, text_kinds, data_kinds, graphics_kinds}

const container_kinds = ["doitbox", "databox", "sprite", "graphics", "svggraphics", "color"];
const graphics_kinds = ["graphics", "color", "svggraphics"];
const data_kinds = ["databox", "sprite", "svggraphics", "graphics", "color"];
const text_kinds = ["text", "jsbox", "htmlbox"];

export {defaultBgColor, defaultPenWidth, defaultPenColorString, defaultFontFamily, defaultFontSize, defaultFontStyle, sprite_params}


const defaultBgColor = "white";
const defaultPenWidth = 1;
const defaultPenColorString = "0 0 0";
const defaultFontFamily = "Arial";
const defaultFontSize = 14;
const defaultFontStyle = "Normal";


const sprite_params =[
        "xPosition",
        "yPosition",
        "pen",
        "shown",
        "heading",
        "spriteSize",
        "penWidth",
        "fontFamily",
        "fontSize",
        "fontStyle",
        "shape",
        "penColor",
        "use_svg"
];
