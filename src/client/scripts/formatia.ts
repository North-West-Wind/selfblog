const ROTATIONS: number[] = Array(2).fill(() => Math.round(Math.random() * 330) + 30).map(x => x());

const SURROUNDABLES = {
	'"': [`<span style="filter:hue-rotate(${ROTATIONS[0]}deg)">"`, "\"</span>"],
	"'": [`<span style="filter:hue-rotate(${ROTATIONS[1]}deg)">'`, "'</span>"],
	"`": ["<code>", "</code>"],
	"*": ["<b>", "</b>"],
	"_": ["<i>", "</i>"],
	"^": [`<span style="font-size:smaller">`, "</span>"]
};

const KEYS = Object.keys(SURROUNDABLES);

let body = document.body.innerHTML;

// replace {this} with the current path basename
body = body.replace(/\{this\}/g, window.location.pathname.split("/").pop()!);

const stack: string[] = [];
let insideTag = false;
let newBody = "";

// single character formats
for (let ii = 0; ii < body.length; ii++) {
	const char = body.charAt(ii);
	// tag check
	if (char == "<") insideTag = true;
	else if (char == ">") insideTag = false;
	// escape character
	if (!insideTag && char == "\\" && ii != body.length - 1) {
		const char = body.charAt(ii+1);
		if (KEYS.includes(char) || char == "\\") {
			newBody += char;
			ii++;
		}
		continue;
	}
	if (!insideTag && KEYS.includes(char)) {
		if (stack[stack.length - 1] == char) {
			stack.pop();
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][1];
		} else {
			stack.push(char);
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][0];
		}
	} else newBody += char;
}

if (stack.length) console.warn("Stack is not empty after formatting");

// markdown links
newBody = newBody.replace(/\[(.*)\](\(.*\))/g, `<a href="$2" target="$1">$1</a>`);

document.body.innerHTML = newBody;