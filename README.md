claude built the base functionality in under an hour (v1.0.0, the commit with message "better erorr handling i think") and i've cleaned it up a bit to fix some UX issues (v1.1.0)

<a href="https://chromewebstore.google.com/detail/latex-copier/kgbkjmgilnbhfaihbekpoedfjmfdncgl">chrome web store link</a>

<a href="https://www.flaticon.com/free-icons/panda" title="panda icons">Panda icons created by Freepik - Flaticon</a>

## TODOs:
(x) = completed
( ) = not completed



## v1.1.0
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



## v1.1.1

- (x) apparently chatgpt uses some thing where i think the wrapper interferes with it when it tries to delete some node. need to test it out and see what exactly is causing the problem.
    - okay i fixed it by removing the wrapper code entirely, and just adding the notif to the parent

- WAIT DID I JUST SOLVE THAT BUG BY REMOVING THE THING NECESSARY TO SOLVE THE ABOVE KATEX BUG????????????? AM I LIKE STUPID OR SMTH ?
    - or did i just stop caring and say "its okay if that happens" bc the other bug was actually bad and this one was just visual
    - also . maybe we can just change the mutationobserver to also activate for innerhtml (or attribute changes) (or smth)

- (x) comment out console.log() stuff