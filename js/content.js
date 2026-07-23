// Embedded directly so this is a single, fully self-contained file that
// works offline and from a plain double-clicked file:// path. Loaded into
// Phaser via textures.addBase64() (see MainScene.create()) rather than
// this.load.spritesheet(), which rejects data URIs.
const SPRITESHEET_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAFACAYAAADqG3NrAAA4uElEQVR4nO19C3QVRbpuBfc4ETBigBACxhhiDAwDCFzkERCFy2UYBhnNCDiMgyz0IIvDoIPcHA7XxxwON5dhZnIYbnwMCx8TBTU6gIhcBoSBABEjAjKIMcYYQgivyCM8VGTf9fdO7dSuXdVd1V392Hv3t9Ze3V39qN3d31//o6r/Srr/peFB5MM11FfOdfXpP9T2NVfrf3jJW0lmz506PCc4/dJ16O7KT0xfI2B0QP3hk6h7XmfkFvTqP7DtGOozsqtr9TuBc6eOoZRO9t6jHrqkd0HHG48jL+P9gT/WbcT1BMRQANx8+X79yFXyA7xI/pI7QoTfhS4x98tohDYqW0onAa1/ak6KtnSjfhpu1w+awk10Se/iKPlJrG1u1n5AfFlzyFADiMJpTQHkd7N+Glbqz8jsHrHdUFcvfSxLU8hc14ua4lfZ3aLIvvtkU3gdmP4ioQVYxwP+WnPUvAnkRZsaWv28/Ex0ovFMWAuI+gJu2/Ss+mWIafXYWPIp/tpCXFarj/HZ2Wbu+f91+EtDbeC4AKggH5DfzfqtwO363SL/pbZdUFV1LeqLjMlPt+Rkqy8D+josTRCIpZaSbP0BaekdTGkBK/U7hVhqqUUA5BfFkM6pwsfqaQARbRDwakvFq99K66+ifqcQb9GfvhnXCbfYZlt8kWvTmsCyCZSaegNqajqLnMC3V37A/x82aAEWKhZ+EbE9rqS/Y/fvtKa4hM0WHfKq0hQ/7ZYWbPrmO8vXEa3r3aMnkpQIgJsvnzSDSNglCINOTUKDiI7bL774Ar0763U0eFEPZAdEojiY/KYjSaesmS2qNAUmJODYh88Gf/7r/2Qet3JZ6wt48c+l6FhTM1rw1Mxw2fQ5xczzZs2YgB58vETcB1ANKzY1affrgewXUFk/Jj8gNzdXW1ZVVaEePXqgn/5sEnp3obEQmKlfZXSI1BQRx7a1ZraIwoym2L1hWMT2kHE7lZ/nmABYtanpVl4PLHPISv1g9kDLj8kPgHUQAoCIEPg+xXHp595Yc97U+5I5rw3LpncTdP28Fp17fk4Kaqo+p6x+p5EoPbpeQRuv2fR0/UBoutdXBHrmkEz92OkFex+3+ABYhzLViLfoj9cR8HL0xwyBMaxoAZL8c+YuQMuKF2vbQHg7SG8G8dZPwMLPZx9Adp+X5OXvAXDYE9v/QOrU9JDMDvs0WYsAAGqGhcrScjLC55LnmI0IgeOL7f7Zs6Zptj4L777zOvcahs4x8T2AijFBssc+ZMP3ACLhU9b3AMuXrwimpNyATlatDe9v/OSg9p5vv3Nw1Lmy+zrn3oMqKnaikpJidf0AdmmKqB7f6oYw+XmAY2hBsOr4YiwveYkpBJj8oClIYE0hEiGyc0yQGz5FFRE+ldUUJ04cR6hDK2m7DB+MwCtht9IHUb975jL3sc7Trk3BdgEwayaRYU9MbFFox7dvq6SDDGx9rAVIcwgDysjoEPYTIEQKEA2T2gU3zKS+RMtvl5l0fMeK8LLL8BmmrxNwo0eXBbJ+uscXWnRaCHb2vMyVX6wBpEKnjPuHVhyITDq/uKXH+0jy0+FRgGhfQSLY9CKoqakWOq4dsQ5CcKHbSGQGAa9Gf2hoQgCEbr6oewwLIlqAVz8mOl0Gpg9t9ujBSAj86E8I2dk5qGxlEWKh/8gCbT9u/Um0O7pNEwKj8y2bQHZrCr3xPhpaTBvs3NbXXwjvkmnxjQBEBcICcb0S+UkkTbFbpzd36z8b0F0/ytCc3K6p7cPBkJRuYudbEgC7NYUMifFnkSKwa7Ac6SPgbdUgoziwrjQ6dEruvzhlJpntBZY93zYn2IymkCW03cBaAMAKgbJ8BNYxVmHrF2NtUVz7FK4JgBlNIUNqsx1doloAf+TefWroP71b+rouwVl+QiLjuEnyGznBVvfTCHgl+mOl11fzBVoIy+og0xuIxrp/VoYHLAgkQCiwZjAiPDjNrGvEok1/SaKjSxbgxO7dxu7NhX2APTrnAvTOpwUk4JXoD90qixIajjNKSRJuzRmCYOX+gdCkEMiSP1ajP1USnzeaQcH0Qm0JZMWktuv8Nl4bJSlKaJHjWOeJQGbosiYEOkMhSPJbGRLtpVGifTOus6X197QP4ISmUJFcSq+DTIrYLceK/CesCXj7ZInPiuTwNIVd44doxIJD6wkn2MqXV3AeTThRQusR1UrLK1wHZeJYqdNK1EfPp7AzMZaC6E97usCM+SN4PtTV7OnRoHYR2mvws0O/lcQTAJvR7EpiLAyj6JPdJPdK9MsteDD61Mw4TJVQcJMHJf1l/n2uaoCKDz9BP/zBNa7U/XnjOXT/2Oix5ImEhy3k548HBLzQo3fukjP5YMzA6v1/se4j1GPCANfq92FRAOx++J8dc7cfwghWyQ/YsqocjZqS72j9Zxsb0PGzoczJube58y1CLECZD2C2pbq9b+vLufGGtmjGrO6orrYabdqQHHGcqnLA12f5Q6pV3T8mPwYIAcCsIMjWjwGdiJFfLPiwRQBUaIraehia2J1YJ6GqHKEbrlc/AgzfP018Gla0gUj9JHAP+j9270d3DunLPO/VV9+O8gG3bt2MVqwIZVFze79ZiF7X8SiQkaZYuGCfreV2woj8TmkDDHKsPBYC+vkfO6b/uanb+81C9LqWBeC7f1ShH9yZqzQ/fCzi5ZVbTJ3z6+mjkJNCAOBpg0REwIpND+QHHFy3F/We0N/yACowTZ74t1zNdl+x4iK6vl2r/Y7LX191NeIc2XK7fBpM5B/174HONUPvNR+fVB1FHRTXrwcg/P6GS+jMV1WGJlGigSsAouTHMBIC2cFTJPndgBuhxyu3jEft2oX6fuC7uB92CpVDLpvb2x+xdG3t+Wf01ci//UsIAvhCYGgC8cZ90+THENEEeoAoEGudd4zZctEokJP58fVy1+hBtn5o+bd/udvXACICQJst28sq9A6POGZEweCYjwI5mR/fCIe+uw0lJ0cK4qFDB9B4iz5VRUXIIadRUDA56MR+Hl555c3wfjqbmxXQ19UVALrl483dJDJPk2hL5aUokNfGvJ85Y37qIN7zHzlyNLp8Wd9nsQvwwUpycnJU/Xl5vaQ1IQ3R6wpFgXgmjx7AHAJgk8jvzncX/vNnI2DUUoiYPXqA80XNITIKZDXaYzYK5ObYm507t3P3HT/Oa4Suk3ayFy2eHDYBepn4kFw1ROofmJMWtOO6UQJAvnxo+UWmrDQygaw6x07CiPw4lo6Bw4m4HMKgZnFnxjn06ZWezH1paUTWJwKfXmFfKwO1dgTha97KcbKzdT48Mfqu1sp+TFCj881C5LoBlWaPVSHwWhSIBpAcOpa63BBqdWGwGSY+WW4FZ858jS5ebM12ZxYN6LZW5dAQ+hLs1ltjd1BcXtcU7RkDcEY4vXVRMAXAqtlj1hzyWhSIR/59X4a+Vut3S+fwQ8flQ5EaXHONQYpISXz//Xe6JlaiIkoA1ry6w9YK4foTfzk8JqJAbuL8+XPo8uXQcGYVSE1NRVeuBNGozMiUgd+gxEaUAGByjv/FaPT1WeuqGKPyQA36JsY/7MBjaqDlB+Dx9mT5O++LTc/ToQOZ4JuPNm2saYKrV79zPRtbjYJsboEeoxH+SjxwIzJcv1nWCWZFP3iTDpOTFavC+QuXXY0C6UV/aPMHEx4QXR56BbSvAPv0xt/w6r94sRl9+635djolJUXKWayx0eml97OcYNb5UFZXJ5eMa+DAgULXDQsA7+WbnaxYFl4d+8Oz/WFdphxfiycEfpxeHxnfVTvnBIukmX5w5pKosleem4+swOtRIB/xB0vfA7AmKbACr0aBRGx/o3IjE8iHO3AtL1AsRIHkbH/9ci+Tv4ZyFp12emXrF4XIdQN2TVYc61Bl++PW38vITuSeYL3ohx3RHlb0BzvAdnys7vW8O27Xn+gIuP3wvRr9AZMFD3Ow0/Y3ev7JyT/UfomOgIl+AKHrohgBqSmcAhYC0oQp3VF9PSynDs85L1LuZds/lmCmHyCuBMAp8j+85C2NyEbAhDcqL90RacP+Zf59QtMXtm17nfZzAjUx0BNsph/A1HBoTII/XHud9DyV723Tj7z8dslb19MEuHjilKvJcfvc7O4URV5Adgz0BJuBVE8wjd8uKjVsCSurTyC91i4Wk+PSAiqqEUSvZ4QhnRqtVOdDEgG7ScAjAI5+eD05riyBYyX643b9Pnz48ACSjJKK0glFre734cPTJpBXk53SmDAoO+oj6XV7ahwTNL/+bFefvyoIzxPsJbDIp1fu1x9fzz+hBcDoIdv9EmKl/qnDc4KPPvpYMN7uXzUCsunkWGk1RPerTHHnQwxYCJ599k+OPvelS5dr9c6bN9sT7xsahOt7/yzqOUQJQLt27dCFCxeE09RZ3e/EjeP10h3VnngZiSQIbsNIC8acCWSERyeNY5KftW13/W7AqH4ghB2mkVfun7xH+j5Zwh8zY4Fo7GsIJT7tl5EcXn/+sXsjjqFbfBAA+KnQBCL12wmz9avSAPtcvn+jexQV8igB8HrypGXzp2vLEXNLwtt4HSOze0awrr4h6kUD8a0KgUj9dsJK/SrIv8zl+xfF+YPvILD5jcB9IC++uDosQadPR39XK4LPP/8svP78839WZnvWli1iSvenX4XG0fzkt8uTeEKAzSArWkCkfrPXVlU/dvrssPtrBep30wkmTV2jZxCTJlBWwcIk1kuwm3ixWL8dTm+Wy/cvFfTY8SddR1hIA3z4oblcod9//71SDTD6T5O0/3TxZGh82mv9WzNxPrB3l7b8+ovQN0Gfvv6hci3w2cZntPO+rD+tbed1SAvvO3wmNDK28uBX2nJh8VrlZFjbt69W/9FvQomyxi2aGt63YWGptjzUHPoY58wtycojX2PG/Cz0/FuS95bOvTu8b2rx+9ry669Dz+ahhx5GTmsAMxE/IQ3AGt8tMu5bBd77w+xgz5vTtfUZRz6J2IdJzwK0UGCbwvlWWiay/m9Qq0CTpOfVj80CVfXv/483I/Zh0hudr6r+R174IGIfJr2d9dsd7o5JE0gU24tnedJB8+Gdvh7TAnDkyFfaD+POO+2d8NmHDzs6Oi11hO3/+APt52VAbBp8Abf/hw9v9vILaQARe97teaZ8JBamKhriIuwE004vaf6Qx/H6AdwERIJ4ESEfanF7aihCtG9tKLU+pElQ1ftux/iuuHaCWVDRERYLWPSbaRGdU/GCqYoHN8aUABytqLGsBazU/+bG0NzHbuHvp0Mxdrdw9Gid4TFZxpOKmoYdI3tjSgB8eB8fN4Wmfnr3mV8gFf0gdg9rN90TDD4AjgD1vf0OdNNNNzveE8wC2ROs2vyhe4JZcLInmAXcE7y8vl55/WOonmAWcE/wP/+535M2v7KeYNoJVpXNSw+bH3tdu/mek/5b+IEA0eltvfH/Vh7gbWOf0s5dNPee8HWB6PQ2sgn37A+Ranb37uH6gOj0tl31b9r0jnbtH/0oJIiY6PR2LH3QFHcfxJCgH1i8O77xhqkOfM1nyQcA08fr8Ekf++R/+sWNqDSHP+7MFQEAm19vMJwPH1bJD8S3G5Z6gt3o/R3RJyuIPsXTICD0KUIdOxPbnftkBbcfqE2ys/5N74cmzmhBR3J7hAP1R0xaVY86HkhtfY0jUu2vH6GIfK4dO15zVtn9s8ifk5Nj2/2Y7gmmwdpvQ09wR4nj7Aia+/Xb+PyB/E60+noCIDfLsBzIazebJd+ps9EhOFaZDULg14/sff6av/bQWG3YRHV1ddDu1j/WokCyZFatAfz6HXj+OGhhN/F5GsDO+TxVXPv0oa9OJtGmyKGvTnYij1FQj1+/B56/U0Lgw0fCwpcwHyjY8IArHwwlZbym8a9hzBhX6s/YtCkplnwAHz6Uw/JoUNUfO/hwD0ktLbJbGgdaZCfqJzWOPxw6RsH6tsH/4k0eAaut/++fyUXoKeRrAYfJ33XUwugdWxb5n31KwrIP8MRTVVYvETekhJ+dqcd1yY8QgnI/A4YcfBPIBDDJfvqzSdz9dpgjeuTH0Pb7msB+AcDmD2iARDCDRFv2Hj16oDlzF6BlxYt9cyQG4IdBBfHuO69LPVgQAt8c8T5izgQymubIDi0ERAZCA7744gvd1p+ErwniVADC0R8CdplBNOG7praXOl71/wGS6wmBj9iCp00gIDMQnvwZgT7eiYnxWK2/HaYQONbHtizSPQb2+/0BcSAAmPwsHGtqjvrxYFUISPPHiOw8OCUEPvkdMIFY5o9qM8iI/FN/HT0VZ+nLG7gaAguBSnOINIVEBEKlP6BdY0v0FEV+yx8HGsAM+bXzfj3OVk3AgqwmUAkgO/1z7c8kigbQa/0x4qlPgGX+mBWCZcWLTbfQVswnXzDiLAyaqDDqAWbByGH24UETCDQHz5QBMwZsfeZ5Oj4AAK4Zi1pJZPiDDwc0gIj5o8oMwjO6swjNEwLV5Bcxf0RhxfyxAn9cUAybQEZCIIpYbfl9JKgJxDKHROL9GPTxZskPLTa03D7iGwEV5k94RKgN0SD6fCfHArUIgSVTyGr0x7f/PWoCkR/CaKR7CmnEFPUTzMI3Z+Tg+wGKBQATn5t73yFBcAoqtICPGBYA8sMXkRaYFoR4yBqBhYC3nyccbkV/fCjWAEB+WRLj450ajWk39IisJxxm4dv/HhEA1U5sPMLrrbzvB8RgP4APfyiDE/AFwKNwQ6sEXcoRiuFGjlBPd4T58OHDhw8bEaVmX3317eCxYw1RB1ZUlKMJE+5TWnlFxU5UUlLsaQcy0fCq4PvfvXsXGjJkaNRxMuUi77+xpiJsFqVnD9Y99qOPPtWO7XZj66R9R7++QVsOGNAzybIPcOLEcZnDfcQZTlDvn8cH2XKrwMQXOYYWBN8J9hGzECG+kSBICYAb8wJ7GSV3/Dg464NPEsaEq4l4/0kcPsiWiwObQ2AKschPmj4YQHTojH2s+J2Icjgf9kkJgOw8wUb7Y1mggPyw/E3eLcH/OvxlUizb/EgQw4aNCK+Xl++IeJ/4/UKmDBYPWOVm3/+c8f2CLz81Jap8wbLnuOf8ae7PtE5ZWnCiBGDr1s2m/lQiAZMfI5aF4Bjl8HbtmiF8rBOA1p50hAEzGi5ryxUZyRHbrHPpMmj1cevPFIAVK0qYL7KgYHJcjOlRTf54EAIWyefNm63dy9Kly11/7ySRofWfwTlu8ZyZaNn6fYbvgHSEfSdYAfnjTQi8Dtzy87ZlEJCJAxvZbFb3YxTmZdnS6hQdrk2yi/zxIgRdu2ZoWkCk5affZ2jbPicYY3C/Xszyin2HpK9l2gk24/TS+2MFouQnhQCWsSwIItBzdun3TzvBVt9/4UvbIraLpo00dR3fBFJMfjPa4LHHFgSTk69DTuLQoQNo7do3k0Czi2Dw4HwUj/AFwCbyywrBmTNNyA2MHDkaXb58OcoE8jrMtvgxIQDYVn/inn4RBPz9WmMP38p5qskfL36B2/jF0NavCiHVzd/e3yN07Ju7jD/GkuoHYDs9KCbsfN4kd88++6eoh/TTbmnBd+vVjlvRrnn0hCeFoIZ4T3r9ALI9wWLHswHhTrwukg/K6BpNZ9nXkOoHsLMnmPXtMH3jot8Xmz0PgyTq+UMvhs890nBa6PyKjz8Pr09/4nlPkp5ENvFeaPMHv7fk5GRDp9apnmCV8KQJlGg4eHCf23/B06BTYY6b2Dokg8SGNdvt7QewEzL5Ps3AnBJ1Bn//+wZNSzz5iwHBS99+b2tdR043o9Xl8Z+oQBS+BjDAzl0fI1lk3PhD6XN8uAOlw6FjySkWxbChtyMrPoBdeHzhv6Abb2jH3PfG+gr0yT92CV+rRuC99erV29CpdaonWCX8nuAYRk3dCSXXyRbs4ddzgp3uCY47E4gVq1fZD/Doo3e5PqpRRQsv27r70EfCfA/AivdbwYMzl0Rsv/LcfOS1Fj577G9Qu3btIz5CR6fXK/hn8QPPfQ+gF7M3m2eUPE82VaOeE3zXjzLCfQ51tXWOOsH793/K3ZeWEoj5RAbLiHH9ZIeWTLgTX0OPN5acYLudXrM9gGbPs+IEZ2ZlKnWCeQTH5O7btyf6+uwF5jGVB2qQ6vfaS8AJVtkTzCIyOcyBHOrAK1feD+B/EyyPYO2kqNZn1eoa9EDhh7oviUdwWXKLIFuwB9/vCfYhjcaa8/5T8zA8EwWiURtsNSkAWUl1jp7vNl5bu9PSfsDOnfJDAxINnhMA7KTm52dGmA6yzqvV82V7glU7wY2fHLS0H9D1fPR/P2LpX8Uf/J5gm53gvsj7qImRnuAP6i5KlSvvB0jAb4LbO1nXx1+ecqwucnxgtt8T7J1+AIzy8veT3Dwf4/peD13P21dZ3dpRVTp6nt5lhOKy71R+xa3LB+JOGmI0mYie+es5H8BjaLagDZoVHN8+AUaDuwrXx4X/Zf59ro7ReXjJW64/Ax/uwXMa4KbcbszyI1VHXb2Wj0gce39cRMPV9e7QRz0JIwATBmVHtdzr9tTE5EPwkbhoo4r8euVOoEt6F0frgwFW8CuZk6n9kAtQmbolUSGtAYDkzxflMff9S+Fhbb8dmuAfu/ejO4dER9W/+0cV+sGdueh4o3ujHn8+sTcswmSctazOdk0YL/MTuA3P+QAyQgDkBxxctxf1ntA/4jjAVI4PYKMQYES0zKoFwu35CUru+HHwb/8W6lP+jJNvJ2EFoNuAe9CjAyIJIPNRipGDisk99NvIXJpYCPB++lqX2nZBVdW1qG/GdU4Lg1Lt4Pb8BCVxNj+CKQEAU8cJm540a3DLjwm+69pLEUJwuvM1EeSnzSUgv1tgaQczguD2/AQlcTg/gmkNsK9lWpp+Gcnh9ecfuxetUzTCgWfTA7FJIdDQ+ZqI/Sw40fLr4W9rQoPXRIlPhxlFUYh6Ms+TDVMec7B+s1/6WQX0EEsLwLL507XliLkl4W28rhosswXs/qHoulbyE+h48vsof8ALpHfKMfYhD2kByCpYmFRbtii4vXhWuAyvf/pVI5qQ8x36yW+Xa1NTWhmGzDJbsNPLIj82g9wWAlWkxy2mkdlh5ISaNUm6uly/p00gLAR0ORAfKQTd8tPExz4AvAQgv54Q0D6F2yaO1+YncLP+zgPvR5cvsxs1u9DQUI8QqpYTgFnPrNUeyJnTR9GC7QgtHtE6qcOC7anogTklwYavWuZpatqo7M+ueXUHujE7Jbz9dc05bfkuCi01nEfhY7AwwHkTfzlcW7eb/HaHOp0WgpIEmR/BUADe+8PsYM+b07X1Jf+M3AekFzlfRjOwxu/86zOTUenLG7T1Z5//d90PU+BjlPfXbQmfZ/dYIDtse7fnJ/hpAs2PYMoEykevMcvL0QPILkB0Z/K08ULH3j1hVFgIYhFuz0/wrgfmR7hnAD9L9tqPWqN+CdUTLANeONRHjMyPMID/NWF19WfK6o5bAdjfcAndlOv2v/Bhdn6EzKy7ucf3a7td2fwIcSsA8QKr8xNsXDGH6cyOnbEsKRbqtxueEwBVDiqEUOPhwxer8xNYTdEyzOX67Z4fwTMCYHecPlHRN7s6buuvUTA/gpQAHNr7d23Z+2b2/nAfAEJo0W+mhXuHReCT3wcJaN158yOohCkN8MZX/ZT+CR/enJ8gEeZHMBQAshOL7AnmAWsBGC6BHHwBbpDACbg9P8HOOJ8fQUoDlDx1j0bqkffMDnv229YuT6K3kUPALwCmWKXnBIgXn8JqasaxAsOgN+pEapyo3835ETzjBKtGPJDfzfkJEmV+BNcFIF5a6lien6CvjZEar8+P4LoA+OT34eb8CNICMKJPVvDqlxGedEdyG/ZvP1CbFOt5f7wCt+YnSJT5EWQFoKPEcWLdhjGkKfLz7w7bs7XB6Ik4VGWk9tL8BMPifH6EgCz5TzEcE1aZSiF4eMlbWtrwydPGn5c95y/z7/O2Eeqd+QkScn4EGQE4LaEB8PFKQefqJ/PzC+Toj0k4MT9BV36osn28z49gVmV3VEV82fTouGU3uOZ50ehTDKVHt3t+Ai/Wb/v8CLHy8pmAzBPTL12H7q78JClW65861drMO598VDEBr/94wOB1sueXlq52lQNu37/rYVAShXlZwaLD8hGk9wfqf8AtSlAn6jdbh96Lp8vMECHWAPfa8db0dVbv3zMCAMSA5eSbugRXHzmeJJKxYBdip9Iw0yI7Ub9MHbLkp/djEpw40epYpqV1Mrx27tDILG1Vu8zndXKC/LA8/XnjBLP37xkBsJKuY21zyMRzKzms6vrJlyZDXqNr4DLetXJbyD93w+PadvG4P2plTguBk/fvCenGLSOg9kKoVYUW8lfZ3ZTkpvlrzdEkt+vn1UHbwKwXh4FfnJEGAHS5KUfXDMDXKm3xATD51+58RyvfenZrWAgAIAR5uQOlnsfhqkpDfpm5/4Zz0YmOaS0gev+e1gCYuHpJmvRS81ltkZ2uX+/l4/2yLaEM5ra0/HQZFgK74cb9uy4A+Z06BMtPnWGW35IS+iJo98nWDHQyoFtwliZwov4vz11AvDpEXz55HNi3elrAqPXTw9aWll8ERYtDiZIxChesNFut8P2zWn/aF5C5f9dNoOXLVwQvXw6lVydnke/9kVhiK9EZSnitsVP13zr73xGrnnPnGqUIACBbQVYYUORaPBNoLqUFcOvf5lSHKPL3Hzg4omxvZUWUEBiZQdgEEr3/K8n8552RkoVk7z9gJRe8VejljDfb6opoAyOfwI767QIr5AcvV8SWJgE2PggBEJ50gln2P4v8ACgrWmxNE5glP9YOIAQy9++6CYRbQhpN33xnW310nkqn6mfVg2H00sjjAAeq909h7e+T03cVeRxcc+vW7aPIYyZNupep3qoIISDLyGOA/NNnLgxv76vcrC37DRwdLlv53CJpIRC9f5nridy/JgBPPBXKu+8WsrNzoohy+oZrmceuXDY3vP7in0u1TyEXPDUzXDZ9TjHzvFkzJqAHHy9Jcqt+Xj0kRFsuHvnxPiwEAPrlA15//e1RekJQOC006rXoJf7o1kXVi9DCnIWGZTLQu3+j1p/2EbA5ZHT/AbP52f/1Pv0ZGP/81lGh/OylJU9H7es/skBb7t4wLKJ8yDjjjyBkz3Oy/rKVRVHH5vTPFyKBCPlpIYAXzTtGTwhEgIkOLT/WAlbIr3f/QP6mU0QqfAOkdkrRBGHHe3sN798TJhBJGJJkZj+nkz3Pyfp5dRnZ6LLmgYigmAUmPGn6kGXgDFsBef+8qI8qmBYA8gsgNq6Jme9Gnaxfpi66Gx9InZ7STTNvGs8dlSb4XXeN2MIzC/Sg1wFGEp93rkiHGPf+k5FU6w+A4x9ZpAXHtpBagHX/Abfzs/tAUkMWMPFBEESFwCzxWQDnFiI9erAaBcL3L2r302ghPyqYOxLMIN37D5jOz66zHx+Tk3Mb+1xB/Hz2AeFjVZzndv1GY3XArsemDZBfTxvAvvS7Qn4a68Vbsf8LNSGYzt1nFvT9N5xrtf2B1C8sFOvfguPg+LLibWj4T/pv2foe//4D5vOz6wtAv7YNqBlFC0DHS1UR+dl5hPnFvSPDHz9DpOX2O0Nx5/e2RQsrWcY772TTOfTKK28GIT1eSUmx4/Xr1YVx/Ei11nQdP1LNjfHTQgBLWhDwNg9WyG8nyPvHoz3BoYWWHIBJferE2SnozDfhe0zPzI7SFnAcD1FhUDcxddbTET2kODQY7BAiTpfhgxHkg2AboQdRv3vmMvexzmOlyXOy/oLphVH14J5g3vh+IyEQIT42AVSiUHFnl97QDiAzCAEmtXb/lXvC+41MJdACgcvsj8tMCwBk7tLLz243ju9YEV52GT7D9vrsrF/v5esJAV5X2YFEQ3YEqBlHmL5/+kMXukVXGRkKuJ2fnddDqtdrCiBFD0h4odtIT9ffq1dv5jVFhjbzhEAPPL8AeQyfCNw/C30GDpISBtASLC0QcDs/O6+HdO+2MmYHFRyLW18S7Y5u00gI+1kdTvh8t+oHATDqCTbrINOdR7zoEJSTmkMEZMs9dsz9YW1QXR09emDpkkcithcXlaE9lXK5klitv964H5kQ6dWrZ6PuP2BnC9+nT5/o/OyC0OuF3frPBmZm6BSic9psL65d9f/fyLT0psEbE4+FwCg0Sg+VEAVJ/qYmtskVPUAuuhExggyhM1rnThcGff8Bt/Oz29U5Fevn6wEPcaCjOaL9AmaFwGs4WCMXbm7TJmnV1avBKeT9B9zOz57oMPq4hfzAA8fzcVSHJwhu4e67p6PU1NSIskED7w7qmUHk/Sfd2NbxbBYBt/Ozy9rCRsfKXMvp+nn79ITgUHXDhUPVDcweXEx8qwPbYqERUAWsBTzTDwAgnUNMElaHET6uNQLM3r93G/98FgmdqH/qrHuZ9eiRAMjPqgc0ARnbB/JjbdBzQI80ZABZ82esgP1vFVZa/97ZfcLasGeP7q0NQYcf6n4zoSsATuVn5wE6jYAkdORE9FyA2fPdqp8MdeoNZcZCQLb6pDbQEwQ3bP9BBmYQJjEJFqE//aKe+2ELXic7yFgQjgI5lZ/dh1qQgkALgSryNzU16e6j/QCvgHX/njCBfKhHLPsEVoA7yFpgKPABt/Oz69npZs0X8loerZ/rj7Dset5+5ADGKrL/Rcwg1v3TZg+5HylAkouTMdAETMj6jbIjs4RAJflLGdmhyW+CWQKgZwIBeCYQSwDcvv8kt/OzJ3r9VtODW0VpjKdHt4qA2/nZDV6A6kkeZGF7/d+O1k8eYDtK3a3e7fs37QQnen56p1B/+CTqntcZJSrqbb7/gNfy04tiTVlJhOaaWDDL9TSPdiCRye/E/Qe8lJ9ehvj0yENc7qQg9OrVLyyEhw7tc1UAfU1x0pSwtKELeF8XqfzqyOy1gORAfF5eSvjRmsFO8kO0A/9IYUgkTVFesNTV+7Z6/21k87O7BUz+oUPHhX8YZJkTQoDJT8ILQiCqKRIZ9dT9tzGbn17vGCv56b0OTP7DLz0YUQ7bsSAEKjVFeUvr7xUtYOb+o0wgUYAQ0ILAKotHYPLzlm611MW1T6B4Qb1Dmirglfz0ZkCaQfEGP/rT2VkB8EJ+ehHs2rUhSgDIMieQN+0VrbWHJb1t17Qac9bfg5aNXxtVnpp6A2pqOhtu/WE5N+v3yG6Ut5g9w2ZNRDtL1mjb+WXzHI+E4fs3izYyLTPs37jxfe3XUH2aOdKOFgxefnbZPwrhTZGsw3CMXaFQ0r7H5Gdt2+EHZPfOZZbjl9916pDwL1GQXjkAXbspR1uaRZQPwBOCvXsPaMQvKJgQ/oEQsAQBC4FRfnrZP0sTG1p+uvW3g/xAaPhlZmYh+PEGg0E5Pgafo6r1J5c0Xs9/O7RSdzZy2yabupxo/cmlk84wkD4vLy/8MxIC3v0znWAQAvoHANKToLedyE+PzR7eUjVI4mOwhACTnzwGC4Id/wtIjn8k+cPLOPYp0lvIT8JICHj3r+sEY58AWn8e2aG8rGzdqoycjlPsStNdV7s3ikS45aeX5LGZWf0taQMeeevqQtnIaCGAclIItP8Q2g6K9hSzbNphRb/Wll3RELSsfG0k6TNvaKnohohtUgtMKr8XxQpSLdr0SodCqIrWqMxPLwMQBitCQJA2iMkMJOeNdy8v18a7axqDFBSZYRL0y6fJzmzxSSEgQZyjSgjKDcwcq84wi/x2CnPAiPhg95uBnfnpManp8T8sTaECpCDofe+anx/6kMQM8XXBIzuxfax0d/hwzRFmnaMQw1rsfnIbokGqwWoAflP5n+jw4cMRZhBsWxYAOj/90ZMX12HTp6xsHdMMgvL+/fuAmRThDDeg01o5C2bJj4lPEx1vk629amHA5BaB8o/CKbJDK6gRg0F+3jkxjTq2MOuRXlRrBHhDnEnyY9BCANvYRxg8eGDUxSsqKjUhUJWfnia6UxqAJL9R1gMwg/DxsGwxi0xjZ+HLIR+g5cXDNhofWvJCoyAQmhYgBEYFygWjPMr7BAhhfnbjW1rLzyK/FhFqzkOPjr1P2AQMGI3v7zC4LTpTcTFMfEx6wgFmkh8A5VgIrEKvdWdpANZxTgCTXoUQQNgTSE628LCNy/VAnlOM1HaOZXPqhvKag2rnnKa1HQYtBHRUSNQEDBh93ALkByHA67QGIMnfuyCUBeFgWXWUEECUyEx+ekxiVnRHTwOQ5pLVaJBVIbA7+kGTzkg4rKLriF7ccrMCwLt/EPad619uLRjZnk96hND69eu1XzRCQtB+8ln5sUBAfFIb0ORnEZ9EixCsQjnIdFZiERLbQXQIhZJmj6h9LysEqkJ/PPJbHSJRLtnJJWsG0fffvDpE2MWImutrPUJp3SNDzTKA65JCIDUYjtQGkPrdiPhWU3NbMWFUmD/a0OflY7X1ptkbw+Tn9QTTwmHFDMK9vqpNCqvIBpNs+yHd/V77z3rgCkC3zm0nlJWti3KEsQaYsXSyFPFV5adnEVtl5xeL/ABYx0IAP1oInE4HSJOspE0FWtpLfzi2WS1QbnKIgwpneEH7yKmnVnTQnxIJtMOMM1n6x5cjdDF/v7Ya0EtNzRMC7cLzVnOdX6fg1mhQGcKbdYDxyM/ABphrMhKzrg5mlom0vHMOskeVxjMG9esdsb1n38FIDaAnBGfPnhlVVrbOlTyTVlpzFZpAa/EZJpDw+U1N4eEUZjrFWORPNJS0iRwBfC1KV3r9JDIxlmh+egDE9nnxfxo4CoS3SfPHTGYyvY4vFcRnjQEyQ34aLCGYuW58kOcAiwoASyMYAWuBN6btSBI1f2SiS6Q20jODWPePHWBAh5RkZAXXprAFJmwCWc1PD0Ml9IRAj/xeBG8AnEzab56TDNemhUAv+nNl3HEhIaBbSdZ1vIomBvlXDG6dbXJGxQuWhcDWTyLHjr1bGy/E6wm2i/x0Sw/bdnd8YWLzBMEoaawZiAqB3vlWkE+23vKTPnoeSuYHwELAKhfJ0S4DI5KrGAFqNIbfLNHNDo4zKwRebvk9LwCy+elbyG4bRIjvpBCYuaaV8zGZRQQhlonffvJZNGP1CxHbV9BZ0w3AteXp5jUATwgSYfYRTFirgqA6ZWIsk1sU9HAFKw0AdnZNm0BeIbtRi27XeB+SwKLC4HaeUC9+eeW1BgDff0QY1I35AazC5vkJPI0NGzZr727cuNExew9W0XyuPtg+pbvp+zctAHqjSJ0QBFX1x6IAYOLTSERBaLYoAG3smh+A/MwS/1TB7fp9eIf8TU0ntGVczQ/gdv1GWL9+U7Curi6irKqqGhUXFznSAm/atFlbjhkzOmJ77tzCoFP/IV4QkJkfQFWWCL1ruV2/lwEEx+u5ua1TsOJ1EEJ8jC8IFrJCuEUct+uPRfKTgHIQAny8nULwyPyCKLPjhSVlSU6bPwBsBpnxBQJm5wfQs8PNzA/gdv1mAGTjkdEJ4tfWRo91t1sbrN7QOjiurqExSiicFAIVUDo/wDN3zHJsfoBEmJ8AExhILSto5DmkENmJnNwspmawA5s3rdPdtl0AaNKRxBPJMi2Lt8teCq8/V7I0ov6dH5SH64d9dtTvJICw8DNDfBr4GviaVq71iAC5nRACSIbwyMyFaODAUBAAlrBtZmos4fkBxlzNQ5vaHObOD/C7vIe0QW8Fgf6o7Mpe6fkBLM5PsIrYtnV+ApbNrdIMIlt9PWSkfRtV1nDiWsP/atU3qGtoRH/8XWtj9PiT06K2Y9YJ1iNhTvdMtO/KKenMz7z5AWSFABwdTGrs/JD7WOuy9bPCnbx9mZmZ2hJIBevwGz2anQFi/PgxSaqIj8nPmikTVVYYCgFZV7EFQSg7/DtUkPckd9tuVFZujloXmT/CMAzKIiG0/oB+jZ3QK81buOTP7p2Nag7WhD96N5ofQEYIFixcghYvmo/GT/7lFN4Q6/WrX13Vsh+ZrZ8EHeu3epweMBlxLy/t4GJNg8nfp09I/R84sDliHQsBSzPhCJEKp7iAIruT5MfAhGc2BoIQmh/ACA+2H7UKyA+AJWxbmR+ANT8BKRRAciA7TXq75ifAxEl0vLCkLKm6qlYzc4qfK9TKMjNCw41hG8phv92RoNFjJkS19mZaf0MnGA8hAPMHAEst63NLhrfSgv9Yhcuh5QfAEh/P+o5YJk8oOYwBhAATn5VhjicIVuqn7WeWINgdBuUBWvuXVi7SXjysa62/g0Iwd2aRtk0unSA/BtnqwzMwqwUM5wcAs4c0b8AcAjMIkx+WJPlJfPS/X9sy4N8eGCU7P4DekAW42cZzR6fsraxYRUq+XgugYn4CMr5uJ+nxsAYWQkIYWme9cHgG28rrbNNcS1bMCxo5u/iY+TOW2iII0OHFCnni9w+RIJlpsgznBwCQ5k11fegBTy37X5oQbNq4jdniYwHBQkDvZ9nfRmN1wK4Pvfg/awRIT3k7YhuWKucn4BHITpMIj+9hdXItKJyvLV9aCb9FUS8fbH+981X/7+qq2nDokyUIdgkBFv7l9Su15ezu002bQrrzA+DYOrTsWAOQoLfpfaxz9MjHq58H0ATgENMmkVESXtEwKM9ZdHswHGDa9IXh9cVFS7jHbTvQmic/I9l6lm7S7scCQJaxeohVQPYzV9HjufMD4LJ+3caHhYBsibFpxLP3yXNE7G5e/dDJBeszZ80Ll18+eeG/k8vaL6qgKZjOI76q+QkSGUsI84dFcLIMWn44XqUWkMn6ISMsuvMD/Krb+HU0wbXten3i05iVMQaVNGwyPb4fY8/uXRrReftbBAFl9cjlHuPDGjKJlp6nAewCFgJs5gxFoTTtexsrIswjGU1hOD+AHgrXrUFFEyaG/QIMlnCAucJqoY3qH3ZHvrb/nffeXjd6VGheqr0f75oOHV70csn/KZw+/38WrQRBSO7c7u/0tczMT+A09JxgGWB7X5XZY2Te2GH2sJCamqbUB2hjlfywXLF3b7icpxlgqAQIgZlxOJe+vTpx9KiJKzdvWTOdfBDkkgY2j0iYrV8U988cF8Q/s9cAJxZ+eAyP6HggXohW5hpGAHMGWnr8I0GXq3SAzSY8EzmPKwBg/sASWnfyhwkP5AfAckb//hFCoAfZDiogP16/9bZhW2EJrT39w/iq/uQtekJg1wTeqgHOK/55yf6fPG5eErT2dIuPy2A/71zV9v/A23tpPyVOsAiA5EB2AG32ZPZKDgkBIRwsLfDk4RenmJkfABNbRMXBsTd37/ylHfMTJDpG5/cPbnopMgtgza6aiP2by/cqj4ZhIYjoA/hJaEFzQsoJ5n1c8tej67WyLh2ztRrrDl3WSL7p8iE0Jjla6rSykGxoWgILCg0YJkGOJzL6uCWW8MZzG2wPg05cEpoTAWPNfOfnRnALpP0PqEDssUAyfoDu/AA0+UXBIz8PMkIw6Ze/1cwgwOef7bwL3yxZbhdG5g8Kiu7fVr4nyYoTTDqvIh1YLBtfRcfXEgs9u3aEQ0lUfhyaqmlwd/OD4QIiJKTJD1qABEsj6AG0wD4UOeKTVT/MT3BLpvrwmqj5QxO+Uyf99OjkfvpcUYHQ68nFGDR5qKEGUCEQdYTdPR8tjfyf00K5YLE5RG8bne8V6M4PcKi6YdRdd+QbdiLRAkGj8coxoRTprPkJvqxrfPWWzPRfgk1POrh6wPY/KxQqQn5MXhbhT53iZ4bG++A8+lx8TbOawavYXL43Cex+ctuOeh54YFrUGCBWPwB5/GuvvWTdCd76QbmQEFglvx5khACTH87p2blHmhnyyxKfdyx5HbwO12cJAf4E0gmUlKwIGg3dqONMPEgTHpeNmRb9MRAZvVExX/Mbb+9BqiEUBTIrBGlZaSgNpSmJtpBCANu0IJBRn0FDhk4fNITfYywLmvxLixYKn2dkNpEAUmZl6c+BCyaPVcfXqm8wpsXcIe16MH2g3C57H3+Bpxq6uUFZX1SJCAIQXwV4X3SBILDKgfiydbByg7JMIBkNgME6n2cCOZW5gUSxpAagP3Ynx/7z9qmawraw8Enp51NU9DtrJhBrfgDQBk6lTOfNT2CG6DLAJGU5wSKCgI8jj4012z9TUbp5FdcBe97MZ6cifoDl9OixDpns0EZhUBKxRngvA4hs9lwRR9iHDx8+fPjw4SPB4NtHDqBgRF6UDVu2/bD/7D0Ay7lBfdiPwmn5waWLJgg7gjLHJjr8VsgBzC2Ijh4Vl8lFiUAIOuWkonkL1yXxCI73wdLK/00k+A/KBCY8MpLbwq57YVuSHQIg07L7AiAO3wSKIYgQ2ye/HKS+CPMRQkammqEeVlr//I0tKeJaUD421+m/FBewRQAgwzEez+50wiin0Ke0UlsemDowYt1N+K2/PHwNEKPwW3ybBQDGjJPbs2bNiLtW3Aru3VymLQ+8VBSx7iMOBIAmPy4zEgLWeWR5rArR0ytmaf+/sdF4CqeZi+7Xjm2oOxERFao/cS58TPe0FMv/aV95g+Vr+OAIAHyUwZqhJFFAEx6W6emRCbWeJlp7cp12lkEgLiOEvm0RiGsP25NBrV9+BuqX3+oo+/6AGHwfIEZAEnrWjMF+T69qAejX33isu8gxoufv22t+vHxh4dPadYqKnnbcpMKmjZUwqZlOMB8uaADZ2VBeWPGCtly8aDGz3CrcJL6PBBGAlpaZ2dKTrTa05jrbEedDOd5vRov4xPfhigawYyJoWUwdnhOs31mKSndUS7X6tWWLmIKWVbAwIbQHDJ7rN3Yemjx5YkLcb0I4wemdUye7/R+8CgiLlm6sjCD76rHzgqtXrwn6QhDDArD5cNMUkvwT/8dQoTxDRWsq0Jr/t2tKxbOPr0qklt+HRQEY2C/y6yXS/CH3XTHYpq95hVg61dpj8mOTSEQIYKjz3j3RqR5xP4DMQDhWxOjbvHSEth9GdgNafnLd1wIKNEB1DflC6ZerHx4MXG3tCXWC/IUTQxmDp/7uFVT65INSQhALSOkup7x9IWAj/BQzUvGqfiq/nOw0CSEJIY2RHnCfAfkH9c1VklIRk5+8fuPJptUozuG3+GJgNiPL//gksgKr5+uhQWA8DmDOc+vRspnjI8oGP/pHS9MjNW3Wz4IdgVz75iLzoQ5cPXqCkwIQWnh6lhIMXtLW51YsD6/PnDFb+M+daoo2mzqlig8kA8JjP8Aq+X0kiADwiK83SQNgz+pdiHWtt9e8hvr0GY0OHNgcXuoJAZgnYKbs2V81Jfum9FUsoag50ihMZpr4Zs2fp2eUJN0/srdwJx6MAtX7dtiHBwVAlPxGMLqO0X4sBDJEF4EI+VkftWNcZpg1yVWnmOVom/61fCRQPwC0+uQStYREK/fxk0NhsqqICCWC0+vDowJw78QHNDOI3DZLXhlhcIr0b2w7mDQh1zd14kIAIFwpYgbJzlLCIr1e68+D35L7sF0D4Jg9SxCGDsqTujjrGqw+AR9yKFlR4fsWSA3+P4tF4JqybmDdAAAAAElFTkSuQmCC";

// ---------------------------------------------------------------------
// Frame index map (matches gen_sprites.py DRAWERS order, 6 cols/row)
// ---------------------------------------------------------------------
const FRAME = {
  grass:0, forest:1, stone_deposit:2, water:3, dirt:4,
  town_hall:5, house:6, farm:7, lumber_camp:8, quarry:9,
  wall:10, wall_gate:11, tower:12, archer:13, villager:14,
  enemy_raider:15, enemy_swordsman:16, arrow:17,
  icon_food:18, icon_wood:19, icon_stone:20, icon_population:21,
  select:22, blocked:23, wall_v:24, enemy_ram:25, granary:26, warehouse:27,
  wall_corner:28, minotaur:29, repairman:30, mill:31, rally_flag:32,
  granary_2:33, granary_3:34, warehouse_2:35, warehouse_3:36, town_hall_2:37, town_hall_3:38,
  creep:39, broodmother:40, forest_corrupted:41, stone_deposit_corrupted:42, zergling_quad:43, spitter_naga:44,
  wildstone_deposit:45, icon_wildstone:46, wildstone_refinery:47, wildstone_deposit_corrupted:48,
  creep_hand:49, headstone:50, crypt:51, ghoul:52, bone_spire:53, graveyard:54, corpse:55,
  troll:56, hobgoblin:57
};

const TILE = 32;
const MAP_W = 44, MAP_H = 32;

const BUILD_DEFS = {
  house:      { name:'House',       cost:{wood:20},            hp:60,  frame:'house',      popCap:4 },
  farm:       { name:'Farm',        cost:{wood:15},             hp:50,  frame:'farm',       produces:{food:4},  needsWorker:true },
  lumber_camp:{ name:'Lumber Camp', cost:{wood:15},             hp:50,  frame:'lumber_camp',produces:{wood:4},  needsWorker:true, bonusNear:'forest' },
  quarry:     { name:'Quarry',      cost:{wood:20,stone:10},    hp:60,  frame:'quarry',     produces:{stone:3}, needsWorker:true, bonusNear:'stone_deposit' },
  // Never player-placed — generateMap() creates one of these automatically
  // sitting exactly on each Wildstone deposit tile, invisible (the crystal
  // outcrop IS the visual). It exists purely so the existing camp/gatherer
  // machinery (assignment, walk-out-harvest-walk-home, hauling, depletion)
  // works for Wildstone with zero new code and zero player construction.
  // Built directly ON a Wildstone deposit tile — like an oil pump on the
  // vein itself, not a camp built nearby. Gated behind Town Hall/Hive
  // level 3 (tcLevelReq), same as everything else that consumes the
  // resource it produces (evolutions). Once built, behaves exactly like a
  // Lumber Camp or Quarry — normal auto-staffing applies, no special
  // exclusion needed anymore now that it's a real, deliberate investment.
  wildstone_refinery: { name:'Wildstone Refinery', cost:{wood:30,stone:40}, hp:80, frame:'wildstone_refinery',
                         produces:{wildstone:1}, needsWorker:true, bonusNear:'wildstone_deposit', tcLevelReq:3 },
  granary:    { name:'Granary',     cost:{wood:25},             hp:80,  frame:'granary',    nearTC:true },
  warehouse:  { name:'Warehouse',   cost:{wood:30},             hp:80,  frame:'warehouse',  nearTC:true },
  mill:       { name:'Mill',        cost:{wood:35,stone:10},    hp:70,  frame:'mill',       isMill:true, needsWorker:true, staffed:true },
  bakery:     { name:'Bakery',      cost:{wood:30,stone:10},    hp:80,  frame:'house',      tint:0xd8a060, isBakery:true, needsWorker:true, staffed:true },
  market:     { name:'Market',      cost:{wood:40,stone:20},    hp:80,  frame:'warehouse',  tint:0xffd76b, isMarket:true },
  mason:      { name:'Mason',       cost:{wood:25,stone:20},    hp:70,  frame:'quarry',     tint:0xbfc4cc, isMason:true },
  apothecary: { name:'Apothecary',  cost:{wood:30,stone:15},    hp:70,  frame:'house',      tint:0x9fe8a0, heals:true },
  well:       { name:'Well',        cost:{wood:10,stone:15},    hp:60,  frame:'stone_deposit', tint:0x9fc4ff, happy:true },
  tavern:     { name:'Tavern',      cost:{wood:40,stone:10},    hp:80,  frame:'house',      tint:0xffb066, happy:true },
  road:       { name:'Road',        cost:{wood:2},              frame:'dirt',               isRoad:true },
  wall:       { name:'Wall',        cost:{stone:5},             hp:120, frame:'wall',       blocksPath:true },
  gate:       { name:'Gate',        cost:{stone:6, wood:4},     hp:120, frame:'wall_gate',  tint:0xb8c4d8, blocksPath:true, friendlyPassable:true },
  tower:      { name:'Tower',       cost:{wood:10,stone:25},    hp:150, frame:'tower',      blocksPath:true, garrison:true, attack:{range:4.2,damage:7,damageLow:4,cooldownMs:900} },
  barracks:   { name:'Barracks',    cost:{wood:30,stone:15},    hp:100, frame:'wall_gate',  trains:'archer' },
};

// Storage buildings: 5 levels each. Granaries hold food; warehouses hold
// wood AND stone. They must sit close to the Town Center (NEAR_TC_RADIUS).
// Levels 4 and 5 are gated behind Town Hall level 2 and 3 respectively —
// a grander town can organize grander stockpiles.
const STORAGE_LEVELS = {
  granary:   { bonus:[120,250,450,750,1200], upCost:[{wood:40,stone:20},{wood:80,stone:50},{wood:150,stone:100},{wood:260,stone:180}],
               upMs:[12000,18000,24000,30000] },
  warehouse: { bonus:[120,250,450,750,1200], upCost:[{wood:40,stone:20},{wood:80,stone:50},{wood:150,stone:100},{wood:260,stone:180}],
               upMs:[12000,18000,24000,30000] },
};
// storage level -> minimum Town Hall level required to buy it
const STORAGE_TC_REQ = { 4: 2, 5: 3 };
const NEAR_TC_RADIUS = 6;

// ---- Town Hall upgrades: a mix of everything ----
// Each level: +HP, +base storage for every resource, +pop cap, faster
// villager training. At level 3 the Town Hall mans its own battlements
// and shoots back.
const TC_LEVELS = {
  maxLevel: 3,
  upCost:       [ {wood:150,stone:100}, {wood:300,stone:250} ], // 1->2, 2->3
  upMs:         [ 25000, 35000 ], // the central building's upgrades take longer
  hpBonus:      [ 250, 250 ],
  storageBonus: [ 50, 100 ],   // added to the base cap per level gained
  popBonus:     [ 2, 3 ],
  trainMs:      [ 20000, 15000, 12000 ], // villager train time at TC level 1/2/3
  attack: { range:4.5, damage:8, cooldownMs:900 }, // active at max level
};

// ---- roads & logistics ----
// Cheap dirt roads speed up anyone walking on them (haulers AND raiders —
// good infrastructure cuts both ways). Chain-place like walls.
const ROAD_SPEED = 1.5;

// ---- wheat -> flour -> bread production chain ----
// Farms grow WHEAT. Staffed Mills grind wheat into FLOUR. Staffed Bakeries
// bake flour into food at a 1.5x premium — bread is worth more than grain.
// The Town Hall can hand-process a weak trickle of wheat straight to food
// (0.6x) so the early game works before the chain is built.
const MILLING = {
  handCapacity: 4,   // wheat/tick the TC can hand-process
  handRate: 0.6,     // food per wheat, hand-processed (wasteful)
  millCapacity: 10,  // wheat/tick per staffed Mill -> flour 1:1
  bakeCapacity: 8,   // flour/tick per staffed Bakery
  bakeRate: 1.5,     // food per flour — the chain's payoff
};

// ---- upkeep economy ----
// Nothing runs for free: soldiers eat double rations (see economyTick),
// and every standing building draws a trickle of maintenance wood. If the
// wood runs dry, buildings weather — slowly losing HP until you restock.
const UPKEEP = {
  soldierFoodPerTick: 1.0,   // vs 0.5 for villagers
  woodPerBuildingPerTick: 0.03,
  decayHpPerTick: 1,         // damage per tick while maintenance is unpaid
};

// ---- raiding races ----
// Each raid wave is ONE race: usually the opposite of the player's faction
// (a human town is besieged by the undead; the undead are hunted by the
// living), sometimes a troll warband. Bandits (from camps) and battering
// rams sit outside this system and never change race. Every race fields a
// melee line and a ranged line; only HUMAN dead leave a corpse to
// raise/bury (undead are already dead, trolls aren't human).
const OPPOSITE_RACE_CHANCE = 0.65;   // vs 0.35 troll warband
const ENEMY_RANGED = { range: 4.2, cooldownMs: 1500, projectileSpeed: 8 }; // tiles; ranged units hold at range and loose
const ENEMY_RACES = {
  human: {
    label: 'knights', banner: 'Human knights ride to war!',
    melee: 'enemy_raider', meleeTough: 'enemy_swordsman', ranged: 'archer', rangedTint: 0xcc5544,
    hpMult: 1.0, dmgMult: 1.0, speedMult: 1.0, meleeSize: 1.0,
    leavesCorpse: true,
  },
  undead: {
    label: 'undead', banner: 'The undead claw out of the earth!',
    melee: 'ghoul', meleeTough: 'ghoul', ranged: 'spitter_naga', rangedTint: null,
    hpMult: 0.9, dmgMult: 1.0, speedMult: 1.05, meleeSize: 1.0,   // frailer, but relentless
    leavesCorpse: false,
  },
  troll: {
    label: 'trolls', banner: 'A troll warband crashes out of the wild!',
    melee: 'troll', meleeTough: 'troll', ranged: 'hobgoblin', rangedTint: null,
    hpMult: 1.5, dmgMult: 1.3, speedMult: 0.85, meleeSize: 1.35,  // hulking, hard-hitting, slow
    rangedSize: 0.95,
    leavesCorpse: false,
  },
};
const ENEMY_RANGED_HP_MULT = 0.7;    // ranged units of any race are frailer than their melee kin

// ---- bandit camps ----
// Camps squat at the map fringes and send the skirmishers. Burn one down
// with your soldiers to stop the raids from that flank and take its loot.
const BANDIT_CAMP = { count:[2,3], hp:220, minDistFromTC:12, loot:{wood:80, stone:40, gold:40} };

// ---- the Captain (hero unit) ----
// One per town. Strong in melee, charges like a swordsman, and nearby
// soldiers fight 25% harder under his banner. If he falls, the Town Hall
// can revive him — heroes are expensive, not disposable.
const CAPTAIN = {
  cost: 60, reviveCost: 75, // gold
  hp: 120,
  attack: { range:1.4, damage:16, cooldownMs:700 },
  aggro: 7,
  auraRange: 3, auraMult: 1.25,
};

// ---- hero combat & growth ----
// The Minotaur fights ONLY on command: J hurls a javelin toward the mouse,
// K slashes everything adjacent. He starts weak and grows with XP earned
// from enemies that die near him (his own killing blows count double).
// Level (and XP) persist through death — revival brings back the same beast.
// (The Broodmother, in swarm mode, branches inside these same two
// functions: J becomes a ranged web shot with a slow debuff instead of the
// javelin's raw damage, K
// stays a summon rather than a slash — see heroThrowJavelin/heroSlash.)
const HERO = {
  baseHp: 70, hpPerLevel: 12, maxLevel: 10,
  xpToNext: (lvl)=> 20 + lvl*15,
  xpValue: { raider:6, pillager:7, swordsman:8, ram:12, camp:30 },
  xpRadius: 5,
  javelin: { baseDmg: 10, dmgPerLevel: 3, range: 7, speed: 12, hitRadius: 0.9, cooldownMs: 4000 },
  slash:   { baseDmg: 8,  dmgPerLevel: 3, radius: 1.8, cooldownMs: 2500 },
  // Broodmother's J — a melee claw swipe replacing the human's ranged
  // javelin. Short reach, faster cooldown: this is her only direct-damage
  // ability now (K is the birth burst, which is pure utility), so it hits
  // a bit harder than the human's slash to compensate for having no ranged option.
  // Broodmother's J — a ranged web shot replacing the melee claw. Lower
  // damage than the human's javelin (it's primarily a control tool), but
  // it applies a temporary movement slow on hit — a mechanic the human
  // side doesn't have at all.
  web: { baseDmg: 6, dmgPerLevel: 2, range: 6, speed: 11, hitRadius: 0.9, cooldownMs: 4000,
         slowFactor: 0.8, slowDurationMs: 3500 }, // 20% slower for 3.5s
};
const ARCHER_COST = { food:30, wood:25 };
const ARCHER_TRAIN_MS = 60000;   // a soldier takes a full minute to equip & drill
let ARCHER_HP = 30;            // lightly armored — keep them behind walls
const VILLAGER_COST = { food:30 };
const VILLAGER_TRAIN_MS = 20000; // settlers take 20s to arrive
const ARCHER_ATTACK = { range:3.5, damage:6, cooldownMs:1100 };
// Swordsmen: tough melee line troops. They auto-charge the nearest enemy
// within 6 tiles, so they hold ground where archers would get overrun.
const SWORDSMAN_COST = { food:30, wood:10, stone:5 };
const SWORDSMAN_TRAIN_MS = 45000;
let SWORDSMAN_HP = 70;
const SWORDSMAN_ATTACK = { range:1.3, damage:12, cooldownMs:800 };

// ---- unit evolutions: permanent, faction-wide upgrades funded by Wildstone ----
// Applies to every unit of that type — existing AND future — the moment it
// completes. Damage/range bonuses just bump the shared ATTACK constants
// (soldiers/zerglings and archers/spitters both read those unconditionally,
// no per-unit patching needed); HP bonuses do need per-unit patching since
// each unit's hp/maxHp is baked in at creation time.
const EVOLUTIONS = {
  swordsman: { name:'Veteran Training',  hpBonus:8, dmgBonus:2, rangeBonus:0,
               cost:{wildstone:15, wood:40, stone:20}, ms:35000 },
  archer:    { name:'Masterwork Bows',   hpBonus:0, dmgBonus:3, rangeBonus:0.5,
               cost:{wildstone:15, wood:30, stone:10}, ms:35000 },
};
const SWORDSMAN_AGGRO = 6;
const RESOURCE_COLOR = { food:'#f0c96b', wood:'#c98f52', stone:'#d4d4dc', wheat:'#e8d48a', flour:'#f5f0e0', gold:'#ffd700' };

// ---- economy difficulty knobs ----
const STORAGE_BASE = 100;               // per-resource cap with just the Town Hall — build granaries/warehouses to grow it
const WILDSTONE_CAP = 60;               // deliberately small and fixed — see storageCapFor
const HARVEST_MS = 1600;                // time spent chopping/mining at the resource tile
const CARRY = {                         // what one villager hauls home per trip
  lumber_camp: { key:'wood',  amt:6 },
  quarry:      { key:'stone', amt:5 },
  wildstone_refinery: { key:'wildstone', amt:2 }, // rare — a trickle, not a flood
};
const FARM_SOIL_WEAR = 0.008;           // fertility lost per harvest tick
const FARM_MIN_FERTILITY = 0.25;
const AUTO_ASSIGN_RADIUS = 4;           // how far pickWorkerFor() will look for an idle villager on its own — an explicit player order (right-click) always ignores this
const ORDER_QUEUE_MAX = 3;              // shift-click order queue depth — bump this alone to allow longer queues

// ---- corpses: the shared raise/bury resource ----
// Dead humans (raiders, skirmishers, and the human player's own villagers &
// soldiers) leave a corpse where they fall. The undead raise them as
// skeletons via the Necromancer; humans bury them for a morale boost.
// Rams and camps are machinery, heroes have their own revive, and the
// undead's units are already dead — none of those leave corpses, so a
// raised skeleton can never be re-raised.
const CORPSE = {
  rotMs: 60000,          // human game: unburied corpses fade away after this
  rotMsSwarm: 45000,     // undead game: then dissolve into carrion (SWARM.corpseBiomass)
  raiseCost: 10,         // carrion the Necromancer spends to raise a skeleton
  buryHappy: 4,          // happiness honor per burial...
  buryHappyCap: 12,      // ...stacking up to this cap...
  buryDecayPerTick: 0.15,// ...and fading this much per economy tick
};

function fmtCost(cost){
  const label = (k)=> k==='wildstone' ? 'Wild' : k[0].toUpperCase(); // "wood" and "wildstone" both start with W
  return Object.entries(cost).map(([k,v])=>`${v}${label(k)}`).join(' ');
}
