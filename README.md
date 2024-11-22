claude built the base functionality in under an hour (v1.0.0, the commit with message "better erorr handling i think") and i've cleaned it up a bit to fix some UX issues (v1.1.0)

<a href="https://www.flaticon.com/free-icons/panda" title="panda icons">Panda icons created by Freepik - Flaticon</a>

## TODOs:

known bugs
- (x) apparently chatgpt uses some thing where i think the wrapper interferes with it when it tries to delete some node. need to test it out and see what exactly is causing the problem.
    - okay i fixed it by removing the wrapper code entirely, and just adding the notif to the parent

- (x) dynamic katex issues w blue hover (bc the class gets removed, it seems like)
- (x) what if we just use katex to have the hover instead of a wrapper
    - wait why did we even create a wrapper elem in the first place - Ohhh it was to do the scrolling so that we could add the notif as a child of the wrapper elem instead of a child of the document body
    - but the katex elem is the clickable one right? not the wrapper
    - idk what to do
okay i've just made it on the wrapper
perhaps not the best fix, but it is a fix

also
- (x) wikipedia cursor+hover is only on the img, but the click-copy functionality is on the whole span
- (x) wikipedia notif is relative to the span coords, not the img
okay idk if i fully fixed these but it's like good enough unless there's like some edge case like the weird BS formatting on the taylor series page

also
- (x) why are the styles of the notif different from website to website? how is it even getting affected