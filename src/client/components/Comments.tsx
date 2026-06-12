import { useEffect, useState } from "react";
import type { DatabaseComment } from "../../db/schema";

type NestedComment = DatabaseComment & { children?: NestedComment[] };

const Comment = (props: { comment: NestedComment }) => {
	return <div class="comment">
		<div class="name">{props.comment.authorName}</div>
		<div class="content" dangerouslySetInnerHTML={{ __html: props.comment.content }}></div>
		{props.comment.children?.map(comment => <Comment comment={comment} />)}
	</div>;
};

const Comments = () => {
	const [apUsername, setApUsername] = useState("");
	const [comments, setComments] = useState<NestedComment[]>();

	useEffect(() => {
		fetch(`/api/comments/${window.location.pathname.replace("/p/", "")}`).then(async res => {
			if (res.ok) {
				const data = await res.json() as DatabaseComment[];
				const comments: NestedComment[] = [];
				const commentMap = new Map<string, NestedComment>();
				for (const comment of data) {
					if (!commentMap.has(comment.replyTargetId)) {
						comments.push(comment);
						commentMap.set(comment.id, comment);
					} else {
						const parent = commentMap.get(comment.replyTargetId)!;
						parent.children = (parent.children || []).concat([comment]);
						commentMap.set(comment.id, comment);
					}
				}
				console.log(comments);
				setComments(comments);
			} else setComments([]);
		}).catch(err => {
			console.error(err);
			setComments([]);
		});
		fetch(`/api/activitypub`).then(async res => {
			if (res.ok) setApUsername(await res.text());
		});
	}, []);

	return <>
		<h1>{comments !== undefined ? `Comments (${comments.length})`: "Loading comments..."}</h1>
		{comments && apUsername && <p>
			Comment from the Fediverse! Search for "{apUsername}@{window.location.host}" on your Mastodon/Lemmy/Piefed (any ActivityPub-based) instance to write your comment!
		</p>}
		{comments?.map(comment => <Comment comment={comment} />)}
	</>
};

export default Comments;