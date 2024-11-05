const ROTATIONS: number[] = Array(3).fill(() => Math.round(Math.random() * 180) + 90).map(x => x());

// add styles
{
	const style = document.createElement('style');
	for (let ii = 0; ii < ROTATIONS.length; ii++) {
		style.innerHTML += `span.colored-${ii} { filter: hue-rotate(${ROTATIONS[ii]}deg) }`
	}
	document.getElementsByTagName('head')[0].appendChild(style);
}

const SURROUNDABLES = {
	'"': [`<span class="colored-0">"`, "\"</span>"],
	"'": [`<span class="colored-1">'`, "'</span>"],
	"`": ["<code>", "</code>"],
	"*": ["<b>", "</b>"],
	"_": ["<i>", "</i>"],
	"^": [`<span style="font-size:smaller">`, "</span>"],
	"|": [`<span class="colored-2">`, "</span>"],
};

const KEYS = Object.keys(SURROUNDABLES);
const ANY_LETTER_REGEX = /\p{L}/u;

const body = document.body.innerHTML;
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
			if (ii != body.length - 1 && ANY_LETTER_REGEX.test(body.charAt(ii+1))) continue;
			// parse only if next char is not alphanumeric
			stack.pop();
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][1];
		} else {
			if (ii != 0 && ANY_LETTER_REGEX.test(body.charAt(ii-1))) continue;
			// parse only if prev char is not alphanumeric
			stack.push(char);
			newBody += SURROUNDABLES[char as keyof typeof SURROUNDABLES][0];
		}
	} else newBody += char;
}

if (stack.length) console.warn("Stack is not empty after formatting");

// markdown links
newBody = newBody.replace(/\[(.*)\]\((.*)\)/g, `<a href="$2" target="$1">$1</a>`);

document.body.innerHTML = newBody;

// make img clickable to new tab
document.body.querySelectorAll("img").forEach(img => {
	img.outerHTML = `<a href="${img.src}" target="${img.alt}">${img.outerHTML}</a>`;
});