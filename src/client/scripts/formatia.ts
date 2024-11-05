const ROTATIONS: number[] = Array(3).fill(() => Math.round(Math.random() * 330) + 30).map(x => x());

const SURROUNDABLES = {
	'"': [`<span style="filter:hue-rotate(${ROTATIONS[0]}deg)">"`, "\"</span>"],
	"'": [`<span style="filter:hue-rotate(${ROTATIONS[1]}deg)">'`, "'</span>"],
	"`": ["<code>", "</code>"],
	"*": ["<b>", "</b>"],
	"_": ["<i>", "</i>"],
	"^": [`<span style="font-size:smaller">`, "</span>"],
	"|": [`<span style="filter:hue-rotate(${ROTATIONS[2]}deg)">`, "</span>"],
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
		const nextChar = body.charAt(ii+1);
		if (KEYS.includes(nextChar) || nextChar == "\\") {
			newBody += nextChar;
			ii++;
		}
		continue;
	}
	if (!insideTag && KEYS.includes(char)) {
		if (stack[stack.length - 1] == char) {
			if (ii != body.length - 1 && /\w/.test(body.charAt(ii+1))) continue;
			// parse only if next char is not alphanumeric
			stack.pop();
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][1];
		} else {
			if (ii != 0 && /\w/.test(body.charAt(ii-1))) continue;
			// parse only if prev char is not alphanumeric
			stack.push(char);
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][0];
		}
	} else newBody += char;
}

if (stack.length) console.warn("Stack is not empty after formatting");

// markdown links
newBody = newBody.replace(/\[(.*)\](\(.*\))/g, `<a href="$2" target="$1">$1</a>`);

document.body.innerHTML = newBody;