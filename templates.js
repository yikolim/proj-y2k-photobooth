// Paths are expressed in the original artwork coordinates. They replace the
// baked-in checkerboards at render time, leaving the supplied PNGs untouched.
const artworkTemplates = {
  penguins: { name: 'Together', width:1448, height:1086, file:'penguins', slots:[
    { box:[220,532,399,344], path:'M 415 533 C 525 532 614 603 615 705 C 617 797 554 872 424 873 C 309 875 225 795 224 704 C 222 605 308 534 415 533 Z' },
    { box:[883,553,356,339], path:'M 1058 554 C 1161 552 1238 612 1236 716 C 1237 824 1171 890 1065 890 C 954 892 883 815 886 712 C 887 613 959 552 1058 554 Z' }
  ]},
  newyear: { name:'Lucky New Year', width:1448, height:1086, file:'new-year', slots:[
    { box:[257,161,225,216], path:'M 285 180 Q 373 140 454 182 Q 482 196 480 230 C 478 312 441 374 371 375 C 300 375 263 316 260 241 Q 256 202 285 180 Z' },
    { box:[920,134,230,239], path:'M 1028 135 C 1102 133 1146 171 1148 240 C 1152 317 1115 370 1048 372 C 980 375 930 322 923 245 C 918 180 963 137 1028 135 Z' }
  ]},
  turtle: { name:'Little Turtle', width:1254, height:1254, file:'turtle', slots:[
    { box:[346,320,397,264], path:'M 350 470 C 361 375 434 320 548 322 C 647 321 716 376 735 456 C 745 488 744 537 721 560 C 689 595 652 580 600 565 C 554 549 516 556 465 571 C 415 587 370 582 354 550 C 346 528 345 493 350 470 Z' }
  ]},
  toilets: { name:'Royal Flush', width:1448, height:1086, file:'toilets', slots:[
    { box:[306,550,332,280], path:'M 472 554 C 553 542 621 589 635 664 C 651 750 587 817 490 828 C 400 839 319 797 309 720 C 298 641 375 568 472 554 Z' },
    { box:[826,550,337,281], path:'M 981 553 C 1072 552 1143 609 1159 681 C 1177 764 1112 828 1028 831 C 927 836 847 783 829 710 C 813 636 886 557 981 553 Z' }
  ]},
  feet: { name:'Sole Mates', width:1448, height:1086, file:'happy-feet', slots:[
    { box:[156,343,485,505], path:'M 414 345 C 544 337 632 408 637 520 C 649 617 568 765 485 820 C 415 870 335 847 276 790 C 205 721 157 622 160 547 C 164 442 276 359 414 345 Z' },
    { box:[842,343,484,503], path:'M 1029 345 C 1161 350 1276 412 1309 516 C 1345 624 1283 755 1195 820 C 1123 870 1048 840 985 784 C 912 720 843 595 844 514 C 841 409 914 342 1029 345 Z' }
  ]},
  kitty: { name:'Kitty Pop', width:1086, height:1448, file:'kitty', slots:[
    { box:[412,560,328,309], path:'M 575 563 C 661 548 727 605 737 681 C 752 771 690 855 606 869 C 520 884 440 832 419 753 C 395 669 464 582 575 563 Z' }
  ]},
  cherries: { name:'Cherry Crush', width:1448, height:1086, file:'cherries', slots:[
    { box:[874,89,379,380], path:'M 1057 91 C 1165 88 1245 166 1252 273 C 1256 386 1192 465 1085 468 C 977 473 890 401 878 292 C 863 185 946 95 1057 91 Z' },
    { box:[876,623,376,382], path:'M 1066 625 C 1174 621 1254 693 1250 804 C 1247 912 1172 994 1070 1003 C 966 1013 886 941 878 837 C 867 728 957 634 1066 625 Z' }
  ]}
};
for (const [key, template] of Object.entries(artworkTemplates)) {
  template.ratio = `${template.width} / ${template.height}`;
  template.label = `${template.name.toUpperCase()} · ${template.slots.length} PHOTO${template.slots.length > 1 ? 'S' : ''}`;
  template.image = new Image();
  template.image.src = `./templates/${template.file}.png`;
  template.ready = template.image.decode();
  template.ready.catch(() => {});
  template.slots.forEach(slot => { slot.clip = new Path2D(slot.path); });
}
