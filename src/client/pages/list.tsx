import AllPostsComponent from "../components/AllPosts";
import { hydrate } from "preact";

hydrate(<AllPostsComponent />, document.getElementById("app")!);